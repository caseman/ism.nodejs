var assert = require('assert')
  , events = require('events')
  , async = require('async')
  , Ctor = require('./ctor')
  , version = require('../package.json').version
  , genUid = require('./uid').genUid
  , key = require('./db').key
  , log = require('./logging').log
  , object = require('./object')
  , nation = require('./nation');

var timestamp = function() {
    return new Date().toUTCString();
}

var Game = Ctor(events.EventEmitter, function() {
    this.init = function(db, uid, properties) {
        events.EventEmitter.call(this);
        this.setMaxListeners(1000);
        this.db = db;
        this.uid = uid;
        this.objectIndex = {};
        this.objects = {};
        this.info = {};
        this.tiles = [];
        this.nations = {};
        this.map = {
            width: 0
          , height: 0
          , startLocations: []
        };
        if (properties) for (var name in properties) {
            this[name] = properties[name];
        }
        this._sightIndex = {};
        for (var objUid in this.objects) {
            var obj = this.objects[objUid];
            if (obj.location) this.placeObject(obj);
        }

        var size = Math.max(this.map.width.toString().length, 
                            this.map.height.toString().length);
        var pad = this.padCoord = function(num) { 
            return ('0000000' + num).slice(-size);
        }
        this.tileKey = function(x, y) {
            return key('g', 'tile', uid, pad(x), pad(y));
        }

        var width = this.map.width;
        this.tile = function(x, y) {
            return this.tiles[(x + width) % width][y];
        }

        this._dirtyNations = null;
        this._dirtyObjects = null;
    }

    /*
     * Begin the next game turn
     * return the turn number
     */
    this.beginNextTurn = function() {
        this.info.turnTime = timestamp();
        this.info.turnNumber = this.info.turnNumber ? this.info.turnNumber + 1 : 1;
        this.saveInfo();
        this._sightIndex = {};
        this.sendEventToAll('turnBegins');
        this.emit('turnBegins');
        return this.info.turnNumber;
    }

    /*
     * Return true if game has started
     */
    this.started = function() {
        return !!this.info.turnNumber;
    }

    /*
     * Save game info to the db
     * Mark a nation as changed so that it will be saved
     * and listeners notified soon. Multiple notifications
     * within one pass of the event loop are collapsed.
     */
    this.saveInfo = function() {
        this.db.put(key('g', 'info', this), this.info);
        this.emit('infoChanged', this.info);
    }

    /*
     * Mark a nation as changed so that it will be saved
     * and listeners notified soon. Multiple notifications
     * within one pass of the event loop are collapsed.
     */
    this.nationChanged = function(nation) {
        if (!this._dirtyNations) {
            this._dirtyNations = {};
            var game = this;
            process.nextTick(function() {
                var dirtyNations = Object.keys(game._dirtyNations);
                game._dirtyNations = null;
                dirtyNations.forEach(function(uid) {
                    var nation = game.nations[uid];
                    if (nation) game.saveNation(nation);
                });
            });
        }
        this._dirtyNations[nation.uid || nation] = true;
    }

    /*
     * Save a nation object to the db, store it in the game, 
     * and notify listeners
     */
    this.saveNation = function(nation) {
        this.nations[nation.uid] = nation;
        this.db.put(key('g', 'nation', this, nation), nation);
    }

    this.uidsAtLocation = function(location) {
        var x = location.x || location[0] || 0
          , y = location.y || location[1] || 0;
        var objsHere = this.objectIndex[[x, y]];
        return objsHere && Object.keys(objsHere);
    }

    /*
     * Return a list of objects at a particular location in game
     */
    this.objectsAtLocation = function(location) {
        var uids = this.uidsAtLocation(location)
          , objects = this.objects;
        if (uids) {
            return uids.map(function(uid) { 
                return objects[uid];
            });
        }
        return [];
    }

    /*
     * Mark that a change occurred at a location and
     * notify any onlookers of the change
     */
    this.locationChanged = function(location) {
        var onlookers = this._sightIndex[location];
        if (onlookers) {
            var tile = this.clientCopyTile(this.tile(location[0], location[1]));
            object.sendEvent('sees', onlookers, this, tile);
        }
    }

    var _remove = function(game, object) {
        if (object.location) {
            var uids = game.objectIndex[object.location];
            if (uids) delete uids[object.uid];
            game.locationChanged(object.location);
            delete object.location;
        }
        delete game.objects[object.uid];
    }

    /*
     * Remove an object from game and delete from the db
     */
    this.removeObject = function(object) {
        _remove(this, object);
        this.db.del(key('g', 'obj', this, object));
        this.emit('objectDeleted', object);
    }

    /*
     * Mark an object changed so that it will be saved
     * and listeners notified soon. Multiple notifications
     * within one pass of the event loop are collapsed.
     */
    this.objectChanged = function(obj) {
        if (!this._dirtyObjects) {
            this._dirtyObjects = {};
            var game = this;
            process.nextTick(function() {
                if (game._dirtyObjects) {
                    var batch = game.db.batch()
                      , dirtyObjects = Object.keys(game._dirtyObjects);
                    game._dirtyObjects = null;
                    dirtyObjects.forEach(function(uid) {
                        var obj = game.objects[uid];
                        if (obj) game.saveObject(obj, null, batch);
                    });
                    batch.write();
                }
            });
        }
        this._dirtyObjects[obj.uid] = true;
    }

    /*
     * Save an object to the db and notify listeners
     */
    this.saveObject = function(object, cb, batch) {
        var batch = batch ? batch : this.db;
        if (object.createdTurn === undefined) {
            object.createdTurn = this.info.turnNumber;
        }
        object.modifiedTurn = this.info.turnNumber;
        batch.put(key('g', 'obj', this, object), object, cb);
        this.emit('objectChanged', object);
        return object;
    }

    /*
     * Place, or move an object to a particular location in game
     */
    this.placeObject = function(obj, location) {
        if (location) {
            _remove(this, obj);
        } else {
            var location = obj.location;
        }
        var x = location.x || location[0] || 0
          , y = location.y || location[1] || 0;
        var objs = this.objectIndex[[x, y]];
        if (!objs) objs = this.objectIndex[[x, y]] = {};
        objs[obj.uid] = true;
        this.objects[obj.uid] = obj;
        obj.location = [x, y];
        this.locationChanged(obj.location);
        this.objectChanged(obj);
        return obj;
    }

    /*
     * Return a copy of a tile suitable for the client
     */
    this.clientCopyTile = function(tile) {
        var objectsThere = this.objectsAtLocation(tile);
        return {
            x: tile.x
          , y: tile.y
          , key: tile.key
          , terrain: tile.terrain
          , biome: tile.biome
          , type: tile.type
          , isLand: tile.isLand
          , isWater: tile.isWater
          , turn: this.info.turnNumber
          , objects: objectsThere.map(function(obj) {
                return object.clientCopy(obj)
            })
        };
    }

    /*
     * Mark an object as an onlooker of a tile
     */
    this.objectSeesTile = function(obj, tile) {
        var onlookers = this._sightIndex[tile.key];
        if (!onlookers) onlookers = this._sightIndex[tile.key] = [];
        if (onlookers.indexOf(obj) == -1) onlookers.push(obj);
    }

    /*
     * Send an event to all objects at a location
     * game and additional args are passed to each handler
     */
    this.sendEventToLocation = function(eventName, location) {
        var args = [eventName, this.objectsAtLocation(location), this];
        args = args.concat(Array.prototype.slice.call(arguments, 2));
        object.sendEvent.apply(this, args);
    }

    /*
     * Send an event to all objects in the game
     */
    this.sendEventToAll = function(eventName) {
        var objects = this.objects
          , iterable = {
                forEach: function(cb) {
                    for (var uid in objects) {cb(objects[uid])}
                }
            }
          , args = [eventName, iterable, this];
        args = args.concat(Array.prototype.slice.call(arguments, 1));
        object.sendEvent.apply(this, args);
    }

    this.chooseNationForClient = function(client) {
        var uids = Object.keys(this.nations).sort();
        for (var i = 0; i < uids.length; i++) {
            var nation = this.nations[uids[i]];
            if (!nation.playerType) {
                nation.playerType = 'remote';
                nation.playerClient = client.cid;
                this.saveNation(nation);
                return nation;
            }
        }
    }
});
exports.Game = Game;

/*
 * Create a new game with a given map and persist it
 */
exports.create = function(db, map, params, cb) {
    var uid = genUid()
      , params = params || {}
      , properties = {
            info: {
                uid: uid
              , created: timestamp()
              , version: version
              , startMonth: params.startMonth || 4
              , turnsPerMonth: params.turnsPerMonth || 4
              , initialNationPop: params.initialNationPop || 4
              , mapWidth: map.width
              , mapHeight: map.height
              , turnNumber: null
              , turnTime: null
            }
          , map: {
                width: map.width
              , height: map.height
              , params: map.params
              , startLocations: map.startLocations || []
            }
          , objects: {}
        }
      , game = new Game(db, uid, properties)
      , batch = db.batch();

    for (var name in properties) {
        batch.put(key('g', name, game), properties[name]);
    }
    game.tiles = [];
    for (var y = 0; y < map.height; y++) {
        for (var x = 0; x < map.width; x++) {
            if (!game.tiles[x]) game.tiles[x] = [];
            var tile = game.tiles[x][y] = map.tiles[x][y];
            batch.put(game.tileKey(x, y), tile);
        }
    }
    batch.write(function(err) {
        if (cb) cb(err, game)
    });
    game.map.startLocations.forEach(function(startLocation) {
        nation.create(game, {startLocation: startLocation});
    });

    return game;
}


var getAll = function(db, key, dest, cb, dataCb) {
    var ended = false;

    db.createValueStream({start: key + '~', end: key + '~~'})
        .on('data', dataCb)
        .on('end', function() {
            ended = true;
            cb(null, dest);
        })
        .on('close', function() {
            if (!ended) cb(new Error("Db stream closed prematurely"));
        })
        .on('error', cb);
}


/*
 * Loads a game from the db
 */
exports.load = function(db, uid, loadCb) {

    var getter = function(subKey) {
        return function(cb) {
            db.get(key('g', subKey, uid), cb);
        }
    }
    var nationProps = [];

    async.series(
        {
            info: getter('info')
          , map: getter('map')
          , tiles: function(cb) {
                var tiles = [];
                getAll(db, key('g', 'tile', uid), tiles, cb, function(tile) {
                    if (!tiles[tile.x]) tiles[tile.x] = [];
                    tiles[tile.x][tile.y] = tile;
                });
            }
          , objects: function(cb) {
                var objects = {};
                getAll(db, key('g', 'obj', uid), objects, cb, function(obj) {
                    if (!(obj.type in object.TYPES)) {
                        log.error('Loaded unknown object type "' + obj.type + '" for game ' + uid);
                        log.debug(obj);
                    }
                    objects[obj.uid] = obj;
                });
            }
          , nations: function(cb) {
                getAll(db, key('g', 'nation', uid), {}, cb, function(nationInfo) {
                    nationProps.push(nationInfo);
                });
            }
        }
      , function(err, gameProperties) {
            if (err) {
                loadCb(err);
            } else {
                var game = new Game(db, uid, gameProperties);
                nationProps.forEach(function(nationInfo) {
                    var theNation = nation.create(game, nationInfo);
                    game.nations[theNation.uid] = theNation;
                });
                loadCb(null, game);
            }
        }
    );
}

/*
 * Provide a list of games stored in the db
 */
exports.list = function list(db, listCb) {
    var info = []
      , sortResults = function(err, results) {
            if (err) {
                listCb(err);
            } else {
                results.sort(function(a, b) {
                    return new Date(b.turnTime || b.created) - new Date(a.turnTime || a.created);
                });
                listCb(null, results);
            }
        }

    getAll(db, key('g', 'info'), info, sortResults, info.push.bind(info));
}



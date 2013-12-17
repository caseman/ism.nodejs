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
        this.db = db;
        this.uid = uid;
        this.objectIndex = [];
        this.objects = {};
        this.tiles = [];
        this.sightIndex = {};
        this.nations = {};
        this.map = {
            width: 0
          , height: 0
          , startLocations: []
        };
        if (properties) for (var name in properties) {
            this[name] = properties[name];
        }
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
    }

    /*
     * Begin the next game turn
     * return the turn number
     */
    this.beginNextTurn = function() {
        this.info.turnTime = timestamp();
        this.info.turnNumber = this.info.turnNumber ? this.info.turnNumber + 1 : 1;
        this.saveInfo();
        this.sightIndex = {};
        this.sendEventToAll('turnBegins');
        this.emit('turnBegins');
        return this.info.turnNumber;
    }

    /*
     * Save game info to the db
     */
    this.saveInfo = function() {
        this.db.put(key('g', 'info', this), this.info);
    }

    /*
     * Save a nation object to the db, store it in the game, 
     * and notify listeners
     */
    this.saveNation = function(nation) {
        this.nations[nation.uid] = nation;
        this.db.put(key('g', 'nation', this, nation), nation);
        this.emit('nationChanged', nation);
    }

    this.uidsAtLocation = function(location) {
        var col = this.objectIndex[location.x || location[0] || 0];
        return col && col[location.y || location[1] || 0];
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

    var _remove = function(game, object) {
        if (object.location) {
            var uids = game.uidsAtLocation(object.location);
            if (uids) for (var i = 0; i < uids.length; i++) {
                if (uids[i] == object.uid) {
                    uids.splice(i, 1);
                    break;
                }
            }
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
     * Save an object to the db and notify listeners
     */
    this.saveObject = function(object, cb, batch) {
        var batch = batch ? batch : this.db;
        batch.put(key('g', 'obj', this, object), object, cb);
        this.emit('objectChanged', object);
        return object;
    }

    /*
     * Place, or move an object to a particular location in game
     */
    this.placeObject = function(object, location) {
        if (location) {
            _remove(this, object);
        } else {
            var location = object.location;
        }
        var x = location.x || location[0] || 0
          , y = location.y || location[1] || 0
          , col = this.objectIndex[x];
        if (!col) col = this.objectIndex[x] = [];
        var objects = col[y];
        if (!objects) objects = col[y] = [];
        objects.push(object.uid);
        this.objects[object.uid] = object;
        object.location = [x, y];
        var onlookers = this.sightIndex[object.location];
        if (onlookers) object.sendEvent('sees', onlookers, this, object);
        this.saveObject(object);
        return object;
    }

    /*
     * Mark a tile as seen by a person this turn
     * Return a list of objects at this location
     */
    this.iSee = function(person, tile) {
        var tileKey = tile.x + ',' + tile.y
          , onlookers = this.sightIndex[tileKey];
        if (!onlookers) onlookers = this.sightIndex[tileKey] = [];
        onlookers.push(person);
        return this.objectsAtLocation(tile);
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
            var tile = map.tiles[x][y];
            var gameTile = game.tiles[x][y] = {
                x: x
              , y: y
              , isLand: tile.isLand
              , type: tile.type
              , terrain: tile.terrain
            };
            if (tile.biome) gameTile.biome = tile.biome;
            batch.put(game.tileKey(x, y), gameTile);
        }
    }
    batch.write(function(err) {
        if (cb) cb(err, game)
    });
    game.map.startLocations.forEach(function(startLocation) {
        nation.create(game, startLocation);
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
                var nations = {};
                getAll(db, key('g', 'nation', uid), nations, cb, function(nation) {
                    nations[nation.uid] = nation;
                });
            }
        }
      , function(err, gameProperties) {
            if (err) {
                loadCb(err);
            } else {
                var game = new Game(db, uid, gameProperties);
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



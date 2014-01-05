var assert = require('assert')
  , async = require('async')
  , level = require('level')
  , memdown = require('memdown')
  , sinon = require('sinon')
  , object = require('../lib/object');


var testDb = function() {
    return level({db:memdown, valueEncoding:'json'});
}
var testMap = function() {
    return {width: 0, height: 0}
}

suite('game.create', function() {
    var game = require('../lib/game');

    test('version matches package', function() {
        var testGame = game.create(testDb(), testMap());
        assert(testGame.info.version, 'version was empty');
        assert.equal(testGame.info.version, require('../package.json').version);
    });

    test('games have unique ids', function() {
        var uids = {};
        for (var i = 0; i < 100; i++) {
            var testGame = game.create(testDb(), testMap());
            assert(testGame.uid, 'Game uid empty');
            assert(!(testGame.uids in uids), 'Game uid not unique');
            uids[testGame.uid] = true;
        }
    });

});

suite('map tiles', function() {
    var Game = require('../lib/game').Game
      , testGame = new Game(null, '1', {map: {width: 32, height: 32}});
    for (var y = 0; y < 32; y++) {
        for (var x = 0; x < 32; x++) {
            var col = testGame.tiles[x];
            if (!col) col = testGame.tiles[x] = [];
            col[y] = {x: x, y: y};
        }
    }

    test('tile() returns tiles', function() {
        for (var y = 0; y < 32; y++) {
            for (var x = 0; x < 32; x++) {
                var tile = testGame.tile(x, y);
                assert.equal(tile.x, x);
                assert.equal(tile.y, y);
            }
        }
    });

    test('tile() returns tiles', function() {
        for (var y = 0; y < 32; y++) {
            for (var x = 0; x < 32; x++) {
                var tile = testGame.tile(x, y);
                assert.equal(tile.x, x);
                assert.equal(tile.y, y);
            }
        }
    });

    test('tile() wraps x', function() {
        for (var y = 0; y < 32; y++) {
            for (var x = 0; x < 32; x++) {
                assert.deepEqual(testGame.tile(x + 32, y), {x: x, y: y});
                assert.deepEqual(testGame.tile(x - 32, y), {x: x, y: y});
            }
        }
    });

    test('tile() does not wraps y', function() {
        for (var y = 0; y < 32; y++) {
            for (var x = 0; x < 32; x++) {
                assert.deepEqual(testGame.tile(x, y - 32), undefined);
                assert.deepEqual(testGame.tile(x + 32, y - 32), undefined);
                assert.deepEqual(testGame.tile(x, y + 32), undefined);
                assert.deepEqual(testGame.tile(x - 32, y + 32), undefined);
            }
        }
    });

});

suite('game object placement', function() {
    var Game = require('../lib/game').Game;

    this.beforeEach(function() {
        object._clearTypes();
        this.game = new Game(testDb());
        this.game.tile = function(x, y) {
            return {
                x: y
              , y: y
              , key: x + ',' + y
            }
        }
    });

    test('new game is empty', function() {
        assert.deepEqual(this.game.objects, {});
        for (var y = 0; y < 100; y++) {
            for (var x = 0; x < 100; x++) {
                var obs = this.game.objectsAtLocation([x, y]);
                assert.equal(obs.length, 0, 'All locations should be empty');
            }
        }
    });

    this.afterEach(function() {
        object._restoreTypes();
    });

    test('place an object and retrieve', function() {
        var obj = {uid:'123'};
        this.game.placeObject(obj, [4, 6]);
        assert.deepEqual(obj.location, [4, 6]);
        assert.deepEqual(this.game.objects['123'], obj);
        assert.deepEqual(this.game.objectsAtLocation([4, 6]), [obj]);
        assert.deepEqual(this.game.objectsAtLocation([4, 5]), []);
        assert.deepEqual(this.game.objectsAtLocation([3, 6]), []);
    });

    test('place an object using tile type location', function() {
        var obj = {uid:'366'}
          , loc = {x: 0, y: 42};
        this.game.placeObject(obj, loc);
        assert.deepEqual(obj.location, [0, 42]);
        assert.deepEqual(this.game.objects['366'], obj);
        assert.deepEqual(this.game.objectsAtLocation(loc), [obj]);
        assert.deepEqual(this.game.objectsAtLocation([0, 42]), [obj]);
    });

    test('place multiple objects', function() {
        var uid = 0;
        for (var y = 0; y < 5; y++) {
            for (var x = 0; x < 5; x++) {
                for (var i = 0; i < x + y; i++) {
                    var obj = {uid:(uid++).toString()};
                    this.game.placeObject(obj, [x, y]);
                }
            }
        }
        assert.equal(Object.keys(this.game.objects).length, uid);
        for (var y = 0; y < 5; y++) {
            for (var x = 0; x < 5; x++) {
                assert.equal(this.game.objectsAtLocation([x, y]).length, x + y);
            }
        }
    });

    test('place and remove objects', function() {
        var objs = [{uid:'1'}, {uid:'2'}, {uid:'3'}, {uid:'4'}]
        this.game.placeObject(objs[0], [1, 1]);
        this.game.placeObject(objs[1], [1, 1]);
        this.game.placeObject(objs[2], [1, 1]);
        this.game.placeObject(objs[3], [5, 3]);
        this.game.removeObject(objs[1]);
        assert.deepEqual(objs[0].location, [1, 1]);
        assert.deepEqual(objs[1].location, undefined);
        assert.deepEqual(objs[2].location, [1, 1]);
        assert.deepEqual(objs[3].location, [5, 3]);
        assert.deepEqual(this.game.objectsAtLocation([1, 1]), [objs[0], objs[2]]);
        assert.deepEqual(this.game.objectsAtLocation([5, 3]), [objs[3]]);

        this.game.removeObject(objs[0]);
        assert.deepEqual(objs[0].location, undefined);
        assert.deepEqual(objs[1].location, undefined);
        assert.deepEqual(objs[2].location, [1, 1]);
        assert.deepEqual(objs[3].location, [5, 3]);
        assert.deepEqual(this.game.objectsAtLocation([1, 1]), [objs[2]]);
        assert.deepEqual(this.game.objectsAtLocation([5, 3]), [objs[3]]);

        this.game.removeObject(objs[3]);
        assert.deepEqual(objs[0].location, undefined);
        assert.deepEqual(objs[1].location, undefined);
        assert.deepEqual(objs[2].location, [1, 1]);
        assert.deepEqual(objs[3].location, undefined);
        assert.deepEqual(this.game.objectsAtLocation([1, 1]), [objs[2]]);
        assert.deepEqual(this.game.objectsAtLocation([5, 3]), []);
    });

    test('object removal is idempotent', function() {
        var obj = {uid:'123'};
        this.game.placeObject(obj, [4, 6]);
        this.game.removeObject(obj);
        this.game.removeObject(obj);
        assert.equal(obj.location, undefined);
        assert.equal(this.game.objects['123'], undefined);
    });

    test('move objects', function() {
        var objs = [{uid:'1'}, {uid:'2'}, {uid:'3'}, {uid:'4'}]
        this.game.placeObject(objs[0], [1, 1]);
        this.game.placeObject(objs[1], [1, 1]);
        this.game.placeObject(objs[2], [1, 1]);
        this.game.placeObject(objs[3], [5, 3]);

        this.game.placeObject(objs[1], [5, 3]);
        assert.deepEqual(this.game.objects[objs[1].uid], objs[1]);
        assert.deepEqual(objs[1].location, [5, 3]);
        assert.deepEqual(this.game.objectsAtLocation([1, 1]), [objs[0], objs[2]]);
        assert.deepEqual(this.game.objectsAtLocation([5, 3]), [objs[3], objs[1]]);

        this.game.placeObject(objs[2], [5, 3]);
        assert.deepEqual(this.game.objects[objs[2].uid], objs[2]);
        assert.deepEqual(objs[2].location, [5, 3]);
        assert.deepEqual(this.game.objectsAtLocation([1, 1]), [objs[0]]);
        assert.deepEqual(this.game.objectsAtLocation([5, 3]), [objs[3], objs[1], objs[2]]);

        this.game.placeObject(objs[3], [4, 3]);
        assert.deepEqual(this.game.objects[objs[3].uid], objs[3]);
        assert.deepEqual(objs[3].location, [4, 3]);
        assert.deepEqual(this.game.objectsAtLocation([1, 1]), [objs[0]]);
        assert.deepEqual(this.game.objectsAtLocation([5, 3]), [objs[1], objs[2]]);
        assert.deepEqual(this.game.objectsAtLocation([4, 3]), [objs[3]]);

        this.game.placeObject(objs[0], [1, 2]);
        assert.deepEqual(this.game.objects[objs[0].uid], objs[0]);
        assert.deepEqual(objs[0].location, [1, 2]);
        assert.deepEqual(this.game.objectsAtLocation([1, 1]), []);
        assert.deepEqual(this.game.objectsAtLocation([1, 2]), [objs[0]]);
        assert.deepEqual(this.game.objectsAtLocation([5, 3]), [objs[1], objs[2]]);
        assert.deepEqual(this.game.objectsAtLocation([4, 3]), [objs[3]]);
    });
    
    test('send event to location', function() {
        var game = this.game;

        object.define('slicer', {
            slice: function(aGame, val) {
                assert.strictEqual(aGame, game);
                this.slicing = val;
            }
        });
        object.define('dicer', {
            dice: function(aGame, val) {
                assert.strictEqual(aGame, game);
                this.dicing = val;
            }
        });
        var objs = [
            object.create('slicer', {location: [1, 2]})
          , object.create('slicer', {location: [1, 2]})
          , object.create('dicer', {location: [1, 2]})
          , object.create('dicer', {location: [5, 6]})
          , object.create('slicer', {location: [5, 6]})
        ];
        objs.forEach(function(obj) {game.placeObject(obj)});

        game.sendEventToLocation('slice', [1, 2], 'yeah');
        assert.deepEqual(objs.map(function(o) {return o.slicing}),
            ['yeah', 'yeah', undefined, undefined, undefined]);

        game.sendEventToLocation('dice', [1, 2], 'bleah');
        assert.deepEqual(objs.map(function(o) {return o.dicing}),
            [undefined, undefined, 'bleah', undefined, undefined]);

        game.sendEventToLocation('slice', [5, 6], 'man');
        assert.deepEqual(objs.map(function(o) {return o.slicing}),
            ['yeah', 'yeah', undefined, undefined, 'man']);

        game.sendEventToLocation('slice', [3, 6], 'woot');
        assert.deepEqual(objs.map(function(o) {return o.slicing}),
            ['yeah', 'yeah', undefined, undefined, 'man']);

        game.sendEventToLocation('dice', [5, 6], 'wah');
        assert.deepEqual(objs.map(function(o) {return o.dicing}),
            [undefined, undefined, 'bleah', 'wah', undefined]);

        game.sendEventToLocation('dice', [5, 5], 'sorry');
        assert.deepEqual(objs.map(function(o) {return o.dicing}),
            [undefined, undefined, 'bleah', 'wah', undefined]);
    });

    test('send event to all objects', function() {
        var game = this.game;

        object.define('doer', {
            doit: function (aGame, how) {
                assert.strictEqual(aGame, game);
                this.done = how;
            }
        });
        var objs = [
            object.create('doer', {location: [2,8]}),
            object.create('doer'),
            object.create('doer', {location: [7,7]}),
            object.create('doer', {location: [0, 100]})
        ];
        objs.forEach(function(obj) {
            if (obj.location) game.placeObject(obj);
        });

        game.sendEventToAll('doit', 'right');
        assert.equal(objs[0].done, 'right');
        assert.equal(objs[1].done, undefined);
        assert.equal(objs[2].done, 'right');
        assert.equal(objs[3].done, 'right');
    });

    test('seeing a tile sends events when new objects placed', function() {
        var tile = this.game.tile.bind(this.game);

        object.define('seer', {
            sees: function(game, tile) {
                this.seen[tile.key] = true;
            }
        });
        var seers = [
            object.create('seer', {location: [2,8], seen:{}}),
            object.create('seer', {location: [2,6], seen:{}}),

        ]
        this.game.placeObject(seers[0]);
        this.game.placeObject(seers[1]);
        this.game.objectSeesTile(seers[0], tile(2,5));
        this.game.objectSeesTile(seers[0], tile(5,5));
        this.game.objectSeesTile(seers[1], tile(5,5));

        var things = [
            object.create('seer', {location: [2,5]}),
            object.create('seer', {location: [5,5]})
        ]
        this.game.placeObject(things[0]);
        this.game.placeObject(things[1]);

        assert(seers[0].seen['2,5']);
        assert(!seers[1].seen['2,5']);
        assert(seers[0].seen['5,5']);
        assert(seers[1].seen['5,5']);
    });

    test('seeing a tile sends events when an object moves', function() {
        var tile = this.game.tile.bind(this.game);

        object.define('seer', {
            sees: function(game, tile) {
                this.seen[tile.key] = true;
            }
        });

        var things = [
            object.create('seer', {location: [0,2]}),
            object.create('seer', {location: [5,3]})
        ]
        this.game.placeObject(things[0]);
        this.game.placeObject(things[1]);

        var seers = [
            object.create('seer', {location: [2,8], seen:{}}),
            object.create('seer', {location: [2,6], seen:{}}),
            object.create('seer', {location: [1,6], seen:{}})

        ]
        this.game.placeObject(seers[0]);
        this.game.placeObject(seers[1]);
        this.game.placeObject(seers[2]);
        this.game.objectSeesTile(seers[0], tile(0,2));
        this.game.objectSeesTile(seers[0], tile(5,3));
        this.game.objectSeesTile(seers[1], tile(5,3));
        this.game.objectSeesTile(seers[2], tile(0,2));

        this.game.placeObject(things[0], [5,3]);

        assert(seers[0].seen['0,2']);
        assert(seers[0].seen['5,3']);
        assert(!seers[1].seen['0,2']);
        assert(seers[1].seen['5,3']);
        assert(seers[2].seen['0,2']);
        assert(!seers[2].seen['5,3']);
    });

    test('seeing a tile sends events when an object is removed', function() {
        var tile = this.game.tile.bind(this.game);

        object.define('seer', {
            sees: function(game, tile) {
                this.seen[tile.key] = true;
            }
        });

        var things = [
            object.create('seer', {location: [3,2]}),
            object.create('seer', {location: [5,0]})
        ]
        this.game.placeObject(things[0]);
        this.game.placeObject(things[1]);

        var seers = [
            object.create('seer', {location: [2,8], seen:{}}),
            object.create('seer', {location: [2,6], seen:{}}),
            object.create('seer', {location: [1,6], seen:{}})

        ]
        this.game.placeObject(seers[0]);
        this.game.placeObject(seers[1]);
        this.game.placeObject(seers[2]);
        this.game.objectSeesTile(seers[0], tile(3,2));
        this.game.objectSeesTile(seers[0], tile(5,0));
        this.game.objectSeesTile(seers[1], tile(5,0));
        this.game.objectSeesTile(seers[2], tile(3,2));

        this.game.removeObject(things[0]);

        assert(seers[0].seen['3,2']);
        assert(!seers[0].seen['5,0']);
        assert(!seers[1].seen['3,2']);
        assert(!seers[1].seen['5,0']);
        assert(seers[2].seen['3,2']);
        assert(!seers[2].seen['5,0']);
    });

});

suite('game persistence', function() {
    var game = require('../lib/game');

    this.beforeEach(function() {
        var db = this.db = {};
        this.db.put = sinon.spy();
        this.db.write = sinon.spy();
        this.db.batch = sinon.spy(function() {return db});
        this.game = new game.Game(this.db, '11223344');
    });

    test('save game info', function() {
        var info = this.game.info = {hells: 'yeah'};
        this.game.saveInfo();
        assert(this.db.put.calledOnce);
        var args = this.db.put.firstCall.args;
        assert.notEqual(args[0].indexOf('~' + this.game.uid), -1, args[0]);
        assert.deepEqual(args[1], info);
    });

    test('save object', function() {
        var obj = {uid: '530298'};
        this.game.saveObject(obj);
        assert(this.db.put.calledOnce);
        var args = this.db.put.firstCall.args;
        assert.notEqual(args[0].indexOf('~' + this.game.uid), -1, args[0]);
        assert.notEqual(args[0].indexOf('~' + obj.uid), -1, args[0]);
        assert.deepEqual(args[1], obj);
    });

    test('saveObject emits event', function(done) {
        var testObj = {uid: '2340598'};
        this.game.on('objectChanged', function(obj) {
            assert.strictEqual(obj, testObj);
            done();
        });
        this.game.saveObject(testObj);
    });

    test('saveObject sets createdTurn and modifiedTurn', function() {
        var testObj = {uid: '23123498'};
        this.game.info.turnNumber = 11;
        this.game.saveObject(testObj);
        assert.equal(testObj.createdTurn, 11);
        assert.equal(testObj.modifiedTurn, 11);
    });

    test('saveObject updates modifiedTurn', function() {
        var testObj = {uid: '34095834', createdTurn: 5, modifiedTurn: 7};
        this.game.info.turnNumber = 12;
        this.game.saveObject(testObj);
        assert.equal(testObj.createdTurn, 5);
        assert.equal(testObj.modifiedTurn, 12);
    });

    test('objectChanged saves each once later', function(done) {
        var obj1 = {uid:'093458123'}
          , obj2 = {uid:'123123333'}
          , obj3 = {uid:'111229999'};
        this.game.objects[obj1.uid] = obj1;
        this.game.objects[obj2.uid] = obj2;
        this.game.objects[obj3.uid] = obj3;

        var save = this.game.saveObject = sinon.spy();
        this.game.objectChanged(obj2);
        this.game.objectChanged(obj1);
        this.game.objectChanged(obj2);
        this.game.objectChanged(obj2);
        this.game.objectChanged(obj2);

        assert(!save.called);
        process.nextTick(function() {
            assert(save.calledTwice);
            assert(save.calledWith(obj1));
            assert(save.calledWith(obj2));
            done();
        });
    });

    test('save nation', function() {
        var testNation = {uid: '850234'};
        this.game.saveNation(testNation);
        assert.strictEqual(this.game.nations[testNation.uid], testNation);
        assert(this.db.put.calledOnce);
        var args = this.db.put.firstCall.args;
        assert.notEqual(args[0].indexOf('~' + this.game.uid), -1, args[0]);
        assert.notEqual(args[0].indexOf('~' + testNation.uid), -1, args[0]);
        assert.deepEqual(args[1], testNation);
    });

    test('saveNation emits event', function(done) {
        var testNation = {uid: '345987098'};
        this.game.on('nationChanged', function(nation) {
            assert.strictEqual(nation, testNation);
            done();
        });
        this.game.saveNation(testNation);
    });

    test('nationChanged saves each once later', function(done) {
        var nation1 = {uid:'529785234'}
          , nation2 = {uid:'234598743'}
          , nation3 = {uid:'234578455'};
        this.game.nations[nation1.uid] = nation1;
        this.game.nations[nation2.uid] = nation2;
        this.game.nations[nation3.uid] = nation3;

        var save = this.game.saveNation = sinon.spy();
        this.game.nationChanged(nation2);
        this.game.nationChanged(nation1);
        this.game.nationChanged(nation2);
        this.game.nationChanged(nation2);
        this.game.nationChanged(nation2);

        assert(!save.called);
        process.nextTick(function() {
            assert(save.calledTwice);
            assert(save.calledWith(nation1));
            assert(save.calledWith(nation2));
            done();
        });
    });

    test('choose nation chooses each once', function() {
        var nations = [
                {uid: "0498503"}
              , {uid: "3457987"}
              , {uid: "43987539458"}
              , {uid: "294387"}
            ]
          , all = {}
          , seen = {}
          , testGame = this.game;
        nations.forEach(function(nat) {
            testGame.nations[nat.uid] = nat;
            all[nat.uid] = nat;
        });
        for (var count = 0; count < nations.length; count++) {
            var client = {cid: "c" + count}
              , nation = this.game.chooseNationForClient(client);
            assert(nation);
            assert(!seen[nation.uid]);
            seen[nation.uid] = true;
            assert(all[nation.uid]);
            assert.equal(nation.playerType, 'remote');
            assert.equal(nation.playerClient, client.cid);
        }
        client = {uid:"3498454"};
        assert(!this.game.chooseNationForClient(client),
            "should return nothing when all nations are chosen");
        assert(!client.playerType);
        assert(!client.playerClient);
    });

});

suite('game turns', function() {
    var game = require('../lib/game');

    test('turn begins null', function() {
        var testGame = game.create(testDb(), testMap());
        assert.strictEqual(testGame.info.turnNumber, null);
        assert.strictEqual(testGame.info.turnTime, null);
    });

    test('started true first turn and after', function() {
        var testGame = game.create(testDb(), testMap());
        assert(!testGame.started());
        testGame.beginNextTurn()
        assert(testGame.started());
        testGame.beginNextTurn()
        testGame.beginNextTurn()
        assert(testGame.started());
    });

    test('turn advances one per', function() {
        var testGame = game.create(testDb(), testMap());
        assert.equal(testGame.beginNextTurn(), 1);
        assert.equal(testGame.beginNextTurn(), 2);
        assert.equal(testGame.beginNextTurn(), 3);
        assert.equal(testGame.beginNextTurn(), 4);
        assert.equal(testGame.info.turnNumber, 4);
    });

    test('next turn advances turn time', function() {
        var testGame = game.create(testDb(), testMap());
        testGame.beginNextTurn();
        assert(testGame.info.turnTime);
        var turnTime = new Date(testGame.info.turnTime);
        assert.notEqual(turnTime, 'Invalid Date');
        assert.equal(turnTime.toUTCString(), testGame.info.turnTime);
    });

    test('next turn saves game info', function() {
        var testGame = game.create(testDb(), testMap());
        testGame.saveInfo = sinon.spy();
        testGame.beginNextTurn();
        assert(testGame.saveInfo.calledOnce);
    });

    test('next turn emits turnBegins event', function(done) {
        var testGame = game.create(testDb(), testMap());
        testGame.on('turnBegins', function() {
            assert.strictEqual(this, testGame);
            done();
        });
        testGame.beginNextTurn();
    });

    test('next turn sends turnBegins to all objects', function() {
        var testGame = game.create(testDb(), testMap());
        object.define('turner', {
            turnBegins: function (aGame) {
                assert.strictEqual(aGame, testGame);
                this.turn = aGame.info.turnNumber;
            }
        });
        var objs = [
            object.create('turner', {location: [0,0]}),
            object.create('turner', {location: [0,0]}),
            object.create('turner', {location: [0,0]}),
            object.create('turner', {location: [0,0]})
        ];
        objs.forEach(function(obj) {
            testGame.placeObject(obj);
        });
        testGame.beginNextTurn();
        assert(objs.every(function(obj) {return obj.turn == 1}));
        testGame.beginNextTurn();
        testGame.beginNextTurn();
        testGame.beginNextTurn();
        assert(objs.every(function(obj) {return obj.turn == 4}));
    });

});

suite('game.list', function() {
    var game = require('../lib/game')
      , assertContainsGame = function(list, game) {
            for (var i = 0; i < list.length; i++) {
                if (list[i].uid == game.uid) return true;
            }
            return false;
        }

    test('empty db returns empty list', function(done) {
        game.list(testDb(), function(err, list) {
            assert(!err, err);
            assert.deepEqual(list, []);
            done();
        });
    });

    test('all games returned', function(done) {
        var db = testDb()
          , map = testMap();
        async.series([
            function(cb) {game.create(db, map, null, cb)}
          , function(cb) {game.create(db, map, null, cb)}
          , function(cb) {game.create(db, map, null, cb)}
          ]
        , function(err, games) {
            assert(!err, err);
            assert.equal(games.length, 3);

            game.list(db, function(err, list) {
                assert(!err, err);
                assert.equal(list.length, 3);
                assertContainsGame(list, games[0]);
                assertContainsGame(list, games[1]);
                assertContainsGame(list, games[2]);
                done();
            });
        });
    });

    test('games returned in reverse chrono order', function(done) {
        var db = testDb()
          , map = testMap();

        var info = [
            {created:'Thu, 12 Dec 2013 03:29:17 GMT'}
          , {created:'Fri, 13 Dec 2013 22:29:10 GMT'}
          , {created:'Wed, 11 Dec 2013 12:29:10 GMT', 
             turnTime:'Thu, 12 Dec 2013 01:29:17 GMT'}
          , {created:'Thu, 12 Dec 2013 00:00:00 GMT', 
             turnTime:'Sat, 14 Dec 2013 02:29:10 GMT'}
          ];

        var createGame = function(num, cb) {
            game.create(db, map, null, function(err, game) {
                game.info.testid = num;
                game.info.created = info[num].created;
                game.info.turnTime = info[num].turnTime;
                game.saveInfo();
                cb(err, game);
            });
        }

        async.series([
            function(cb) {createGame(0, cb)}
          , function(cb) {createGame(1, cb)}
          , function(cb) {createGame(2, cb)}
          , function(cb) {createGame(3, cb)}
          ]
        , function(err, games) {
            assert(!err, err);
            assert.equal(games.length, 4);

            game.list(db, function(err, list) {
                assert(!err, err);
                assert.equal(list.length, 4);
                assert.equal(list[0].testid, 3);
                assert.equal(list[1].testid, 1);
                assert.equal(list[2].testid, 0);
                assert.equal(list[3].testid, 2);
                done();
            });
        });
    });

});

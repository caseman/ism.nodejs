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

    test('turn begins null', function() {
        var testGame = game.create(testDb(), testMap());
        assert.strictEqual(testGame.info.turnNumber, null);
        assert.strictEqual(testGame.info.turnTime, null);
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

    test('new game is empty', function() {
        var testGame = new Game;
        assert.deepEqual(testGame.objects, {});
        for (var y = 0; y < 100; y++) {
            for (var x = 0; x < 100; x++) {
                var obs = testGame.objectsAtLocation([x, y]);
                assert.equal(obs.length, 0, 'All locations should be empty');
            }
        }
    });

    test('place an object and retrieve', function() {
        var testGame = new Game(testDb());
        var obj = {uid:'123'};
        testGame.placeObject(obj, [4, 6]);
        assert.deepEqual(obj.location, [4, 6]);
        assert.deepEqual(testGame.objects['123'], obj);
        assert.deepEqual(testGame.objectsAtLocation([4, 6]), [obj]);
        assert.deepEqual(testGame.objectsAtLocation([4, 5]), []);
        assert.deepEqual(testGame.objectsAtLocation([3, 6]), []);
    });

    test('place an object using tile type location', function() {
        var testGame = new Game(testDb());
        var obj = {uid:'366'}
          , loc = {x: 0, y: 42};
        testGame.placeObject(obj, loc);
        assert.deepEqual(obj.location, [0, 42]);
        assert.deepEqual(testGame.objects['366'], obj);
        assert.deepEqual(testGame.objectsAtLocation(loc), [obj]);
        assert.deepEqual(testGame.objectsAtLocation([0, 42]), [obj]);
    });

    test('place multiple objects', function() {
        var testGame = new Game(testDb());
        var uid = 0;
        for (var y = 0; y < 5; y++) {
            for (var x = 0; x < 5; x++) {
                for (var i = 0; i < x + y; i++) {
                    var obj = {uid:(uid++).toString()};
                    testGame.placeObject(obj, [x, y]);
                }
            }
        }
        assert.equal(Object.keys(testGame.objects).length, uid);
        for (var y = 0; y < 5; y++) {
            for (var x = 0; x < 5; x++) {
                assert.equal(testGame.objectsAtLocation([x, y]).length, x + y);
            }
        }
    });

    test('place and remove objects', function() {
        var testGame = new Game(testDb());
        var objs = [{uid:'1'}, {uid:'2'}, {uid:'3'}, {uid:'4'}]
        testGame.placeObject(objs[0], [1, 1]);
        testGame.placeObject(objs[1], [1, 1]);
        testGame.placeObject(objs[2], [1, 1]);
        testGame.placeObject(objs[3], [5, 3]);
        testGame.removeObject(objs[1]);
        assert.deepEqual(objs[0].location, [1, 1]);
        assert.deepEqual(objs[1].location, undefined);
        assert.deepEqual(objs[2].location, [1, 1]);
        assert.deepEqual(objs[3].location, [5, 3]);
        assert.deepEqual(testGame.objectsAtLocation([1, 1]), [objs[0], objs[2]]);
        assert.deepEqual(testGame.objectsAtLocation([5, 3]), [objs[3]]);

        testGame.removeObject(objs[0]);
        assert.deepEqual(objs[0].location, undefined);
        assert.deepEqual(objs[1].location, undefined);
        assert.deepEqual(objs[2].location, [1, 1]);
        assert.deepEqual(objs[3].location, [5, 3]);
        assert.deepEqual(testGame.objectsAtLocation([1, 1]), [objs[2]]);
        assert.deepEqual(testGame.objectsAtLocation([5, 3]), [objs[3]]);

        testGame.removeObject(objs[3]);
        assert.deepEqual(objs[0].location, undefined);
        assert.deepEqual(objs[1].location, undefined);
        assert.deepEqual(objs[2].location, [1, 1]);
        assert.deepEqual(objs[3].location, undefined);
        assert.deepEqual(testGame.objectsAtLocation([1, 1]), [objs[2]]);
        assert.deepEqual(testGame.objectsAtLocation([5, 3]), []);
    });

    test('object removal is idempotent', function() {
        var testGame = new Game(testDb());
        var obj = {uid:'123'};
        testGame.placeObject(obj, [4, 6]);
        testGame.removeObject(obj);
        testGame.removeObject(obj);
        assert.equal(obj.location, undefined);
        assert.equal(testGame.objects['123'], undefined);
    });

    test('move objects', function() {
        var testGame = new Game(testDb());
        var objs = [{uid:'1'}, {uid:'2'}, {uid:'3'}, {uid:'4'}]
        testGame.placeObject(objs[0], [1, 1]);
        testGame.placeObject(objs[1], [1, 1]);
        testGame.placeObject(objs[2], [1, 1]);
        testGame.placeObject(objs[3], [5, 3]);

        testGame.placeObject(objs[1], [5, 3]);
        assert.deepEqual(testGame.objects[objs[1].uid], objs[1]);
        assert.deepEqual(objs[1].location, [5, 3]);
        assert.deepEqual(testGame.objectsAtLocation([1, 1]), [objs[0], objs[2]]);
        assert.deepEqual(testGame.objectsAtLocation([5, 3]), [objs[3], objs[1]]);

        testGame.placeObject(objs[2], [5, 3]);
        assert.deepEqual(testGame.objects[objs[2].uid], objs[2]);
        assert.deepEqual(objs[2].location, [5, 3]);
        assert.deepEqual(testGame.objectsAtLocation([1, 1]), [objs[0]]);
        assert.deepEqual(testGame.objectsAtLocation([5, 3]), [objs[3], objs[1], objs[2]]);

        testGame.placeObject(objs[3], [4, 3]);
        assert.deepEqual(testGame.objects[objs[3].uid], objs[3]);
        assert.deepEqual(objs[3].location, [4, 3]);
        assert.deepEqual(testGame.objectsAtLocation([1, 1]), [objs[0]]);
        assert.deepEqual(testGame.objectsAtLocation([5, 3]), [objs[1], objs[2]]);
        assert.deepEqual(testGame.objectsAtLocation([4, 3]), [objs[3]]);

        testGame.placeObject(objs[0], [1, 2]);
        assert.deepEqual(testGame.objects[objs[0].uid], objs[0]);
        assert.deepEqual(objs[0].location, [1, 2]);
        assert.deepEqual(testGame.objectsAtLocation([1, 1]), []);
        assert.deepEqual(testGame.objectsAtLocation([1, 2]), [objs[0]]);
        assert.deepEqual(testGame.objectsAtLocation([5, 3]), [objs[1], objs[2]]);
        assert.deepEqual(testGame.objectsAtLocation([4, 3]), [objs[3]]);
    });
    
    test('send event to location', function() {
        var testGame = new Game(testDb());
        object.define('slicer', {
            slice: function(aGame, val) {
                assert.strictEqual(aGame, testGame);
                this.slicing = val;
            }
        });
        object.define('dicer', {
            dice: function(aGame, val) {
                assert.strictEqual(aGame, testGame);
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
        objs.forEach(function(obj) {testGame.placeObject(obj)});

        testGame.sendEventToLocation('slice', [1, 2], 'yeah');
        assert.deepEqual(objs.map(function(o) {return o.slicing}),
            ['yeah', 'yeah', undefined, undefined, undefined]);

        testGame.sendEventToLocation('dice', [1, 2], 'bleah');
        assert.deepEqual(objs.map(function(o) {return o.dicing}),
            [undefined, undefined, 'bleah', undefined, undefined]);

        testGame.sendEventToLocation('slice', [5, 6], 'man');
        assert.deepEqual(objs.map(function(o) {return o.slicing}),
            ['yeah', 'yeah', undefined, undefined, 'man']);

        testGame.sendEventToLocation('slice', [3, 6], 'woot');
        assert.deepEqual(objs.map(function(o) {return o.slicing}),
            ['yeah', 'yeah', undefined, undefined, 'man']);

        testGame.sendEventToLocation('dice', [5, 6], 'wah');
        assert.deepEqual(objs.map(function(o) {return o.dicing}),
            [undefined, undefined, 'bleah', 'wah', undefined]);

        testGame.sendEventToLocation('dice', [5, 5], 'sorry');
        assert.deepEqual(objs.map(function(o) {return o.dicing}),
            [undefined, undefined, 'bleah', 'wah', undefined]);
    });

    test('send event to all objects', function() {
        var testGame = new Game(testDb());
        object.define('doer', {
            doit: function (aGame, how) {
                assert.strictEqual(aGame, testGame);
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
            if (obj.location) testGame.placeObject(obj);
        });

        testGame.sendEventToAll('doit', 'right');
        assert.equal(objs[0].done, 'right');
        assert.equal(objs[1].done, undefined);
        assert.equal(objs[2].done, 'right');
        assert.equal(objs[3].done, 'right');
    });

});

suite('game persistence', function() {
    var game = require('../lib/game');

    this.beforeEach(function() {
        this.db = {};
        this.db.put = sinon.spy();
        this.testGame = new game.Game(this.db, '11223344');
    });

    test('save game info', function() {
        var info = this.testGame.info = {hells: 'yeah'};
        this.testGame.saveInfo();
        assert(this.db.put.calledOnce);
        var args = this.db.put.firstCall.args;
        assert.notEqual(args[0].indexOf('~' + this.testGame.uid), -1, args[0]);
        assert.deepEqual(args[1], info);
    });

    test('save object', function() {
        var obj = {uid: '530298'};
        this.testGame.saveObject(obj);
        assert(this.db.put.calledOnce);
        var args = this.db.put.firstCall.args;
        assert.notEqual(args[0].indexOf('~' + this.testGame.uid), -1, args[0]);
        assert.notEqual(args[0].indexOf('~' + obj.uid), -1, args[0]);
        assert.deepEqual(args[1], obj);
    });

    test('saveObject emits event', function(done) {
        var testObj = {uid: '2340598'};
        this.testGame.on('objectChanged', function(obj) {
            assert.strictEqual(obj, testObj);
            done();
        });
        this.testGame.saveObject(testObj);
    });

    test('save nation', function() {
        var testNation = {uid: '850234'};
        this.testGame.saveNation(testNation);
        assert.strictEqual(this.testGame.nations[testNation.uid], testNation);
        assert(this.db.put.calledOnce);
        var args = this.db.put.firstCall.args;
        assert.notEqual(args[0].indexOf('~' + this.testGame.uid), -1, args[0]);
        assert.notEqual(args[0].indexOf('~' + testNation.uid), -1, args[0]);
        assert.deepEqual(args[1], testNation);
    });

    test('saveNation emits event', function(done) {
        var testNation = {uid: '345987098'};
        this.testGame.on('nationChanged', function(nation) {
            assert.strictEqual(nation, testNation);
            done();
        });
        this.testGame.saveNation(testNation);
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

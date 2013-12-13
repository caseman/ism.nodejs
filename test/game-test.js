var assert = require('assert')
  , async = require('async')
  , level = require('level')
  , memdown = require('memdown');


var testDb = function() {
    return level({db:memdown, valueEncoding:'json'});
}
var testMap = function() {
    return {width: 0, height: 0}
}

suite('createGame', function() {
    var createGame = require('../lib/game').createGame;

    test('version matches package', function() {
        var testGame = createGame(testDb(), testMap());
        assert(testGame.info.version, 'version was empty');
        assert.equal(testGame.info.version, require('../package.json').version);
    });

    test('turn begins null', function() {
        var testGame = createGame(testDb(), testMap());
        assert.strictEqual(testGame.info.turnNumber, null);
        assert.strictEqual(testGame.info.turnTime, null);
    });

    test('games have unique ids', function() {
        var uids = {};
        for (var i = 0; i < 100; i++) {
            var testGame = createGame(testDb(), testMap());
            assert(testGame.uid, 'Game uid empty');
            assert(!(testGame.uids in uids), 'Game uid not unique');
            uids[testGame.uid] = true;
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
        var testGame = new Game;
        var obj = {uid:'123'};
        testGame.placeObject(obj, [4, 6]);
        assert.deepEqual(obj.location, [4, 6]);
        assert.deepEqual(testGame.objects['123'], obj);
        assert.deepEqual(testGame.objectsAtLocation([4, 6]), [obj]);
        assert.deepEqual(testGame.objectsAtLocation([4, 5]), []);
        assert.deepEqual(testGame.objectsAtLocation([3, 6]), []);
    });

    test('place multiple objects', function() {
        var testGame = new Game;
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
        var testGame = new Game;
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
        var testGame = new Game;
        var obj = {uid:'123'};
        testGame.placeObject(obj, [4, 6]);
        testGame.removeObject(obj);
        testGame.removeObject(obj);
        assert.equal(obj.location, undefined);
        assert.equal(testGame.objects['123'], undefined);
    });

    test('move objects', function() {
        var testGame = new Game;
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
            function(cb) {game.createGame(db, map, null, cb)}
          , function(cb) {game.createGame(db, map, null, cb)}
          , function(cb) {game.createGame(db, map, null, cb)}
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
            game.createGame(db, map, null, function(err, game) {
                game.info.testid = num;
                game.info.created = info[num].created;
                game.info.turnTime = info[num].turnTime;
                game.save();
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

suite('object types and events', function() {
    var game = require('../lib/game');

    test('cannot define same type twice', function() {
        game._clearObjectTypes();
        game.defineObjectType('same', {});
        assert.throws(function() {
            game.defineObjectType('same', {});
        });
    });

    test('create object with type', function() {
        var testGame = new game.Game;
        game._clearObjectTypes();
        game.defineObjectType('test', {});
        var obj = testGame.createObject('test');
        assert.equal(obj.type, 'test', 'Object should have a type');
        assert(obj.uid, 'Object should have a uid');
    });

    test('create object with location', function() {
        var testGame = new game.Game;
        game._clearObjectTypes();
        game.defineObjectType('test', {});
        var obj = testGame.createObject('test', [5,8]);
        assert.deepEqual(testGame.objects[obj.uid], obj);
        assert.deepEqual(obj.location, [5,8]);
    });

    test('send event to objects', function() {
        var testGame = new game.Game;
        game._clearObjectTypes();
        game.defineObjectType('test1', {
            event1: function(aGame, val) {
                assert.deepEqual(aGame, testGame);
                this.event1 = val;
            },
            event2: function(aGame, x, y) {
                this.where = [x, y];
            }
        });
        game.defineObjectType('test2', {
            event2: function(aGame, x, y) {
                this.where = [x + 1, y + 1];
            }
        });
        var objs = [
            testGame.createObject('test1'),
            testGame.createObject('test2'),
            testGame.createObject('test1'),
            testGame.createObject('test2')
        ];

        testGame.sendEvent('event1', objs, 42);
        assert.equal(objs[0].event1, 42);
        assert.equal(objs[1].event1, undefined);
        assert.equal(objs[2].event1, 42);
        assert.equal(objs[3].event1, undefined);

        testGame.sendEvent('event2', objs, 3, 9);
        assert.deepEqual(objs[0].where, [3, 9]);
        assert.deepEqual(objs[1].where, [4, 10]);
        assert.deepEqual(objs[2].where, [3, 9]);
        assert.deepEqual(objs[3].where, [4, 10]);
    });

    test('send event to objects', function() {
        var testGame = new game.Game;
        game._clearObjectTypes();
        game.defineObjectType('slicer', {
            slice: function(aGame, val) {
                this.slicing = val;
            }
        });
        game.defineObjectType('dicer', {
            dice: function(aGame, val) {
                this.dicing = val;
            }
        });
        var objs = [
            testGame.createObject('slicer', [1, 2]),
            testGame.createObject('slicer', [1, 2]),
            testGame.createObject('dicer', [1, 2]),
            testGame.createObject('dicer', [5, 6]),
            testGame.createObject('slicer', [5, 6])
        ];

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


    test('Unknown event to objects throws', function() {
        var testGame = new game.Game;
        game._clearObjectTypes();
        assert.throws(function() {
            testGame.sendEvent('gawrsh', []);
        });
    });

    test('Unknown event to location throws', function() {
        var testGame = new game.Game;
        game._clearObjectTypes();
        assert.throws(function() {
            testGame.sendEventToLocation('meow', [0, 0]);
        });
    });

});

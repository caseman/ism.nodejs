var assert = require('assert');

suite('createGame', function() {
    var createGame = require('../lib/game').createGame;

    test('version matches package', function() {
        var game = createGame({});
        assert(game.version, 'version was empty');
        assert.equal(game.version, require('../package.json').version, 'version no match');
    });

    test('turn begins null', function() {
        var game = createGame({});
        assert.equal(game.turn, null, 'turn not null');
    });

    test('games have unique ids', function() {
        var uids = {};
        for (var i = 0; i < 100; i++) {
            var game = createGame({});
            assert(game.uid, 'Game uid empty');
            assert(!(game.uids in uids), 'Game uid not unique');
            uids[game.uid] = true;
        }
    });

});

suite('game object placement', function() {
    var game = require('../lib/game');

    test('new game is empty', function() {
        var newGame = game.createGame({});
        assert.deepEqual(newGame.objects, {});
        for (var y = 0; y < 100; y++) {
            for (var x = 0; x < 100; x++) {
                var obs = game.objectsAtLocation(newGame, [x, y]);
                assert.equal(obs.length, 0, 'All locations should be empty');
            }
        }
    });

    test('place an object and retrieve', function() {
        var testGame = game.createGame({});
        var obj = {uid:'123'};
        game.placeObject(testGame, obj, [4, 6]);
        assert.deepEqual(obj.location, [4, 6]);
        assert.deepEqual(testGame.objects['123'], obj);
        assert.deepEqual(game.objectsAtLocation(testGame, [4, 6]), [obj]);
        assert.deepEqual(game.objectsAtLocation(testGame, [4, 5]), []);
        assert.deepEqual(game.objectsAtLocation(testGame, [3, 6]), []);
    });

    test('place multiple objects', function() {
        var testGame = game.createGame({});
        var uid = 0;
        for (var y = 0; y < 5; y++) {
            for (var x = 0; x < 5; x++) {
                for (var i = 0; i < x + y; i++) {
                    var obj = {uid:(uid++).toString()};
                    game.placeObject(testGame, obj, [x, y]);
                }
            }
        }
        assert.equal(Object.keys(testGame.objects).length, uid);
        for (var y = 0; y < 5; y++) {
            for (var x = 0; x < 5; x++) {
                assert.equal(game.objectsAtLocation(testGame, [x, y]).length, x + y);
            }
        }
    });

    test('place and remove objects', function() {
        var testGame = game.createGame({});
        var objs = [{uid:'1'}, {uid:'2'}, {uid:'3'}, {uid:'4'}]
        game.placeObject(testGame, objs[0], [1, 1]);
        game.placeObject(testGame, objs[1], [1, 1]);
        game.placeObject(testGame, objs[2], [1, 1]);
        game.placeObject(testGame, objs[3], [5, 3]);
        game.removeObject(testGame, objs[1]);
        assert.deepEqual(objs[0].location, [1, 1]);
        assert.deepEqual(objs[1].location, undefined);
        assert.deepEqual(objs[2].location, [1, 1]);
        assert.deepEqual(objs[3].location, [5, 3]);
        assert.deepEqual(game.objectsAtLocation(testGame, [1, 1]), [objs[0], objs[2]]);
        assert.deepEqual(game.objectsAtLocation(testGame, [5, 3]), [objs[3]]);

        game.removeObject(testGame, objs[0]);
        assert.deepEqual(objs[0].location, undefined);
        assert.deepEqual(objs[1].location, undefined);
        assert.deepEqual(objs[2].location, [1, 1]);
        assert.deepEqual(objs[3].location, [5, 3]);
        assert.deepEqual(game.objectsAtLocation(testGame, [1, 1]), [objs[2]]);
        assert.deepEqual(game.objectsAtLocation(testGame, [5, 3]), [objs[3]]);

        game.removeObject(testGame, objs[3]);
        assert.deepEqual(objs[0].location, undefined);
        assert.deepEqual(objs[1].location, undefined);
        assert.deepEqual(objs[2].location, [1, 1]);
        assert.deepEqual(objs[3].location, undefined);
        assert.deepEqual(game.objectsAtLocation(testGame, [1, 1]), [objs[2]]);
        assert.deepEqual(game.objectsAtLocation(testGame, [5, 3]), []);
    });

    test('object removal is idempotent', function() {
        var testGame = game.createGame({});
        var obj = {uid:'123'};
        game.placeObject(testGame, obj, [4, 6]);
        game.removeObject(testGame, obj);
        game.removeObject(testGame, obj);
        assert.equal(obj.location, undefined);
        assert.equal(testGame.objects['123'], undefined);
    });

    test('move objects', function() {
        var testGame = game.createGame({});
        var objs = [{uid:'1'}, {uid:'2'}, {uid:'3'}, {uid:'4'}]
        game.placeObject(testGame, objs[0], [1, 1]);
        game.placeObject(testGame, objs[1], [1, 1]);
        game.placeObject(testGame, objs[2], [1, 1]);
        game.placeObject(testGame, objs[3], [5, 3]);

        game.placeObject(testGame, objs[1], [5, 3]);
        assert.deepEqual(testGame.objects[objs[1].uid], objs[1]);
        assert.deepEqual(objs[1].location, [5, 3]);
        assert.deepEqual(game.objectsAtLocation(testGame, [1, 1]), [objs[0], objs[2]]);
        assert.deepEqual(game.objectsAtLocation(testGame, [5, 3]), [objs[3], objs[1]]);

        game.placeObject(testGame, objs[2], [5, 3]);
        assert.deepEqual(testGame.objects[objs[2].uid], objs[2]);
        assert.deepEqual(objs[2].location, [5, 3]);
        assert.deepEqual(game.objectsAtLocation(testGame, [1, 1]), [objs[0]]);
        assert.deepEqual(game.objectsAtLocation(testGame, [5, 3]), [objs[3], objs[1], objs[2]]);

        game.placeObject(testGame, objs[3], [4, 3]);
        assert.deepEqual(testGame.objects[objs[3].uid], objs[3]);
        assert.deepEqual(objs[3].location, [4, 3]);
        assert.deepEqual(game.objectsAtLocation(testGame, [1, 1]), [objs[0]]);
        assert.deepEqual(game.objectsAtLocation(testGame, [5, 3]), [objs[1], objs[2]]);
        assert.deepEqual(game.objectsAtLocation(testGame, [4, 3]), [objs[3]]);

        game.placeObject(testGame, objs[0], [1, 2]);
        assert.deepEqual(testGame.objects[objs[0].uid], objs[0]);
        assert.deepEqual(objs[0].location, [1, 2]);
        assert.deepEqual(game.objectsAtLocation(testGame, [1, 1]), []);
        assert.deepEqual(game.objectsAtLocation(testGame, [1, 2]), [objs[0]]);
        assert.deepEqual(game.objectsAtLocation(testGame, [5, 3]), [objs[1], objs[2]]);
        assert.deepEqual(game.objectsAtLocation(testGame, [4, 3]), [objs[3]]);
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
        game._clearObjectTypes();
        game.defineObjectType('test', {});
        var obj = game.createObject('test');
        assert.equal(obj.type, 'test', 'Object should have a type');
        assert(obj.uid, 'Object should have a uid');
    });

    test('create object with location', function() {
        var testGame = game.createGame({});
        game._clearObjectTypes();
        game.defineObjectType('test', {});
        var obj = game.createObject('test', testGame, [5,8]);
        assert.deepEqual(testGame.objects[obj.uid], obj);
        assert.deepEqual(obj.location, [5,8]);
    });

    test('send event to objects', function() {
        var testGame = game.createGame({});
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
            game.createObject('test1'),
            game.createObject('test2'),
            game.createObject('test1'),
            game.createObject('test2')
        ];

        game.sendEvent('event1', objs, testGame, 42);
        assert.equal(objs[0].event1, 42);
        assert.equal(objs[1].event1, undefined);
        assert.equal(objs[2].event1, 42);
        assert.equal(objs[3].event1, undefined);

        game.sendEvent('event2', objs, testGame, 3, 9);
        assert.deepEqual(objs[0].where, [3, 9]);
        assert.deepEqual(objs[1].where, [4, 10]);
        assert.deepEqual(objs[2].where, [3, 9]);
        assert.deepEqual(objs[3].where, [4, 10]);
    });

    test('send event to objects', function() {
        var testGame = game.createGame({});
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
            game.createObject('slicer', testGame, [1, 2]),
            game.createObject('slicer', testGame, [1, 2]),
            game.createObject('dicer', testGame, [1, 2]),
            game.createObject('dicer', testGame, [5, 6]),
            game.createObject('slicer', testGame, [5, 6])
        ];

        game.sendEventToLocation('slice', [1, 2], testGame, 'yeah');
        assert.deepEqual(objs.map(function(o) {return o.slicing}),
            ['yeah', 'yeah', undefined, undefined, undefined]);

        game.sendEventToLocation('dice', [1, 2], testGame, 'bleah');
        assert.deepEqual(objs.map(function(o) {return o.dicing}),
            [undefined, undefined, 'bleah', undefined, undefined]);

        game.sendEventToLocation('slice', [5, 6], testGame, 'man');
        assert.deepEqual(objs.map(function(o) {return o.slicing}),
            ['yeah', 'yeah', undefined, undefined, 'man']);

        game.sendEventToLocation('slice', [3, 6], testGame, 'woot');
        assert.deepEqual(objs.map(function(o) {return o.slicing}),
            ['yeah', 'yeah', undefined, undefined, 'man']);

        game.sendEventToLocation('dice', [5, 6], testGame, 'wah');
        assert.deepEqual(objs.map(function(o) {return o.dicing}),
            [undefined, undefined, 'bleah', 'wah', undefined]);

        game.sendEventToLocation('dice', [5, 5], testGame, 'sorry');
        assert.deepEqual(objs.map(function(o) {return o.dicing}),
            [undefined, undefined, 'bleah', 'wah', undefined]);
    });


    test('Unknown event to objects throws', function() {
        var testGame = game.createGame({});
        game._clearObjectTypes();
        assert.throws(function() {
            game.sendEvent('gawrsh', [], game);
        });
    });

    test('Unknown event to location throws', function() {
        var testGame = game.createGame({});
        game._clearObjectTypes();
        assert.throws(function() {
            game.sendEventToLocation('meow', [0, 0], game);
        });
    });


});

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
        assert.equal(game.turn, null, 'version not null');
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

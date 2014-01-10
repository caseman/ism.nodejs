var assert = require('assert')
  , level = require('level')
  , memdown = require('memdown')
  , async = require('async')
  , key = require('../lib/db').key
  , game = require('../lib/game')
  , Map = require('../lib/map').Map
  , mapConfig = require('../map-config/default.json');

mapConfig.seed = 1;
mapConfig.width = mapConfig.height = 16;
mapConfig.moistureReach = 3;

var testDb = function() {
    return level({ db:memdown, valueEncoding:'json' });
}

var dbGet = function(game, subKey) {
    return function(cb) {
        game.db.get(key('g', subKey, game), cb);
    }
}

var dbGetAll = function(game, subKey, expectedCount, assertion) {
    return function(cb) {
        var startKey = key('g', subKey, game) + '~'
          , actualCount = 0
          , stream = game.db.createValueStream({start: startKey, end: startKey + '~'})

        stream
            .on('data', function(item) {
                try {
                    assertion(item);
                } catch (err) {
                    cb(err);
                    stream.close();
                    return;
                }
                actualCount++;
            })
            .on('end', function() {
                try {
                    assert.equal(actualCount, expectedCount);
                    cb(null, true);
                } catch (err) {
                    cb(err);
                    return;
                }
            })
            .on('error', function(err) {
                assert(!err, err);
            });
    }
}

suite('Game persistence', function() {
    var map = new Map(mapConfig);
    // Map is very small, force some start locations
    map.startLocations = (function() {
        locations = [];
        for (var y = 3; y < 16; y += 3) {
            for (var x = 0; x < 16; x++) {
                var tile = map.tiles[x][y];
                if (tile.isLand && tile.terrain != 'mountain') {
                    locations.push([x, y]);
                    if (locations.length == 4) return locations;
                    break;
                }
            }
        }
        return locations;
    })();
    assert(map.startLocations.length);

    test('game.create', function(done) {
        var db = testDb()
        game.create(db, map, {}, function(err, theGame) {
            assert(!err, err);
            assert.strictEqual(theGame.db, db);
            assert(theGame.info.version);
            assert.equal(theGame.map.width, 16);
            assert.equal(theGame.map.height, 16);
            assert.equal(theGame.tiles.length, 16);
            assert.equal(theGame.tiles[0].length, 16);
            var nationCount = Object.keys(theGame.nations).length;
            assert.equal(nationCount, map.startLocations.length);
            var peopleCount = Object.keys(theGame.nations).reduce(
                function(count, uid) {
                    return count + theGame.nations[uid].people.length;
                }
              , 0);
            var objectCount = Object.keys(theGame.objects).length;
            assert.equal(objectCount, peopleCount);

            async.series({
                    info: dbGet(theGame, 'info')
                  , map: dbGet(theGame, 'map')
                  , tiles: dbGetAll(theGame, 'tile', 16*16, function(tile) {
                        assert.deepEqual(tile, theGame.tiles[tile.x][tile.y]);
                    })
                  , nations: dbGetAll(theGame, 'nation', nationCount, function(nation) {
                        assert.deepEqual(nation, theGame.nations[nation.uid].toJSON());
                    })
                  , objects: dbGetAll(theGame, 'obj', objectCount, function(obj) {
                        assert.deepEqual(obj, theGame.objects[obj.uid]);
                    })
                }
              , function(err, data) {
                    assert(!err, err);
                    assert.deepEqual(data.info, theGame.info);
                    assert.deepEqual(data.map, theGame.map);
                    done();
                }
            );
        });
    });

    test('create game and load game', function(done) {
        var db = testDb();
        game.create(db, map, {}, function(createErr, createdGame) {
            assert(!createErr, createErr);
            game.load(db, createdGame.uid, function(loadErr, loadedGame) {
                assert(!loadErr, loadErr);
                assert.deepEqual(createdGame.info, loadedGame.info);
                assert.deepEqual(createdGame.map, loadedGame.map);
                assert.deepEqual(createdGame.turn, loadedGame.turn);
                assert.deepEqual(createdGame.tiles, loadedGame.tiles);
                assert.equal(createdGame.nations.length, loadedGame.nations.length);
                for (var uid in createdGame.nations) {
                    assert.deepEqual(createdGame.nations[uid].toJSON(), 
                                     loadedGame.nations[uid].toJSON());
                }
                assert.deepEqual(createdGame.objects, loadedGame.objects);
                done();
            });
        });
    });

});




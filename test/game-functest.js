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

suite('Game persistence', function() {
    var map = new Map(mapConfig);

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

            async.series({
                    info: dbGet(theGame, 'info')
                  , map: dbGet(theGame, 'map')                  , tiles: function(cb) {
                        var count = 0
                          , startKey = key('g', 'tile', theGame) + '~'
                          , stream = db.createValueStream({start: startKey, end: startKey + '~'})

                        stream
                            .on('data', function(tile) {
                                try {
                                    assert.deepEqual(tile, theGame.tiles[tile.x][tile.y]);
                                } catch (err) {
                                    cb(err);
                                    stream.close()
                                    return;
                                }
                                count++;
                            })
                            .on('end', function() {
                                try {
                                    assert.equal(count, 16 * 16);
                                    cb(null, true);
                                } catch (err) {
                                    cb(err);
                                    return;
                                }
                            })
                    }
                }
              , function(err, data) {
                    assert(!err, 'Error: ' + err);
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
                done();
            });
        });
    });

});




var assert = require('assert')
  , sinon = require('sinon')
  , object = require('../lib/object')
  , testGame = sinon.mock();

suite('object sight', function() {
    var sight = require('../lib/sight');

    this.beforeEach(function() {
        testGame.info = {turnNumber: 33};
        testGame.tile = sinon.spy(function(x, y) {
            return {
                x: x
              , y: y
              , key: x + ',' + y
              , terrain: 'flat'
              , biome: 'grassland'
              , type: 'flat-grassland'
              , isLand: true
              , objects: []
            };
        });
        object._clearTypes();
        this.sees = sinon.spy();
        object.define('seer', {sees: this.sees});
    });

    test('sees surrounding tiles', function() {
        var testObj = object.create('seer');
        testObj.location = [5,3];
        testObj.sight = 2;
        testGame.objectSeesTile = sinon.spy(function(obj, tile) {
            assert.strictEqual(obj, testObj);
            assert.equal(tile.type, 'flat-grassland');
        });
        testGame.clientCopyTile = sinon.spy(function(tile) {return tile});

        sight.look(testObj, testGame);
        assert.equal(testGame.objectSeesTile.callCount, 25);
        for (var y = 1; y <= 5; y++) {
            for (var x = 3; x <= 7; x++) {
                assert(testGame.objectSeesTile.calledWith(testObj, testGame.tile(x, y)), [x, y]);
                assert(this.sees.calledWith(testGame, testGame.tile(x, y)));
            }
        }
    });

});


var assert = require('assert');

suite('createGame', function() {
    var createGame = require('../lib/game').createGame;

    test('version matches package', function(done) {
        createGame({}, function(game) {
            assert(game.version, 'version was empty');
            assert.equal(game.version, require('../package.json').version, 'version no match');
            done();
        });
    });

    test('turn begins null', function(done) {
        createGame({}, function(game) {
            assert.equal(game.turn, null, 'version not null');
            done();
        });
    });

});

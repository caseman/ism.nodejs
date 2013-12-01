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

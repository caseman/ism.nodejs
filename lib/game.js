var version = require('../package.json').version;
var genUid = require('./uid').genUid;

exports.createGame = function(map, callback) {
    var game = {
      map: map
    , players: []
    , turn: null
    , startMonth: 4
    , turnsPerMonth: 4
    , version: version
    };
    genUid(function(uid) {
        game.uid = uid;
        callback(game);
    });
}


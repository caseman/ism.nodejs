var version = require('../package.json').version;
var genUid = require('./uid').genUid;

exports.createGame = function(map, callback) {
    var game = {
      uid: genUid()
    , map: map
    , nations: {}
    , players: []
    , turn: null
    , startMonth: 4
    , turnsPerMonth: 4
    , version: version
    };
    return game;
}


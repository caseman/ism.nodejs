var genUid = require('./uid').genUid
  , key = require('./db').key;

exports.create = function(startLocation, playerType, clientId) {
    var nation = {
        uid: genUid()
      , startLocation: startLocation
      , people: []
      , lastSpawn: null
      , spawnPoints: 0
      , tilesSeen: {}
      , skillsLearned: {}
      , skillsInProgress: {}
      , equipLearned: {}
      , equipInProgress: {}
      , player: {
          type: playerType
        , turnCompleted: null
        , clientId: clientId
        }
    };
    return nation;
}



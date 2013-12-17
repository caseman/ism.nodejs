var genUid = require('./uid').genUid
  , person = require('./person');

exports.create = function(game, startLocation) {
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
          type: null
        , turnCompleted: null
        }
    };
    for (var i = 0; i < game.info.initialNationPop; i++) {
        exports.spawn(game, nation);
    }
    game.saveNation(nation);
    return nation;
}

exports.spawn = function(game, nation, nearLocation) {
    var newbie = person.create(2)
      , placed = person.place(newbie, game, nearLocation || nation.startLocation);
    if (placed) {
        nation.people.push(newbie.uid);
        newbie.nationUid = nation.uid;
        nation.lastSpawn = game.info.turnNumber;
        nation.spawnPoints = 0;
        game.saveObject(newbie);
    }
    return placed;
}


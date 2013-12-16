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
    game.saveNation(nation);

    for (var i = 0; i < game.info.initialNationPop; i++) {
        exports.spawn(game, nation);
    }
    return nation;
}

exports.spawn = function(game, nation, nearLocation) {
    var newbie = person.create(game, 2)
      , placed = person.placePerson(newbie, game, nearLocation || nation.startLocation);
    if (placed) {
        game.saveObject(newbie);
        nation.people.push(newbie.uid);
        newbie.nationUid = nation.uid;
        nation.lastSpawn = game.info.turnNumber;
        nation.spawnPoints = 0;
    }
    return placed;
}


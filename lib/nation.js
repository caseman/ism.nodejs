var extend = require('extend')
  , EventEmitter = require('events').EventEmitter
  , Ctor = require('./ctor')
  , genUid = require('./uid').genUid
  , object = require('./object')
  , person = require('./person');

var Nation = Ctor(EventEmitter, function() {
    this.init = function(game, properties) {
        EventEmitter.call(this);
        extend(true, this, Nation.defaults, properties);
        if (!this.uid) this.uid = genUid();
        this._game = game;
    }

    /*
     * Spawn a person for a nation
     */
    this.spawn = function(nearLocation) {
        var newbie = person.create(2)
          , placed = person.place(newbie, this._game, nearLocation || this.startLocation);
        if (placed) {
            this.people.push(newbie.uid);
            newbie.nationUid = this.uid;
            this.lastSpawn = this._game.info.turnNumber;
            this.spawnPoints = 0;
            this._game.objectChanged(newbie);
            this._game.nationChanged(this);
        }
        return placed;
    }

    /*
     * Spawn the initial population for a nation
     */
    this.spawnInitialPeople = function() {
        for (var i = 0; i < this._game.info.initialNationPop; i++) {
            this.spawn();
        }
    }

    /*
     * Remember the contents of a tile as seen now
     */
    this.rememberTile = function(tile) {
        this.tilesSeen[tile.key] = tile;
        this._game.nationChanged(this);
    }

    this.toJSON = function() {
        var json = {};
        for (var name in Nation.defaults) {
            json[name] = this[name];
        }
        return json;
    }
});

Nation.defaults = {
    uid: null
  , name: 'Unnamed'
  , startLocation: null
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
}

exports.create = function(game, properties) {
    var nation = new Nation(game, properties);
    if (!properties.people) nation.spawnInitialPeople();
    game.saveNation(nation);
    return nation;
}




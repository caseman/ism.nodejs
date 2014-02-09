var extend = require('extend')
  , EventEmitter = require('events').EventEmitter
  , Ctor = require('./ctor')
  , genUid = require('./uid').genUid
  , person = require('./person');

var Nation = Ctor(EventEmitter, function() {
    this.init = function(game, properties) {
        var nation = this;
        EventEmitter.call(this);
        extend(true, this, Nation.defaults, properties);
        if (!properties.name) {
            var name = randomName(game);
            if (name) {
                this.name = this.originalName = name.name;
                this.demonym = name.demonym;
            }
        }
        if (!this.uid) this.uid = genUid();
        this._game = game;

        game.on('objectChanged', function(obj) {
            if (obj.type == 'person' && obj.nationUid == nation.uid) {
                nation.emit('personChanged', obj);
            }
        });
    }

    /*
     * Spawn a person for a nation
     */
    this.spawn = function(nearLocation) {
        var newbie = person.create(2)
          , placed = person.place(newbie, this._game, nearLocation || this.startLocation, this.avoid);
        if (placed) {
            this.people.push(newbie.uid);
            newbie.nationUid = this.uid;
            newbie.items = ['tent'];
            this.lastSpawn = this._game.info.turnNumber;
            this.spawnPoints = 0;
            this._game.objectChanged(newbie);
            this._game.nationChanged(this);
            return newbie;
        }
    }

    /*
     * Spawn the initial population for a nation
     */
    this.spawnInitialPeople = function() {
        var avoid = this.avoid = {};
        for (var i = 0; i < this._game.info.initialNationPop; i++) {
            var person = this.spawn();
            if (person) {
                var x = person.location[0]
                  , y = person.location[1];
                avoid[[x,y-1]] = avoid[[x-1,y-1]] = avoid[[x+1,y-1]] = true;
                avoid[[x,y]] = avoid[[x-1,y]] = avoid[[x+1,y]] = true;
                avoid[[x,y+1]] = avoid[[x-1,y+1]] = avoid[[x+1,y+1]] = true;
            }
        }
        this.avoid = null;
    }

    this.changed = function(attr) {
        var nationInfo = {};
        nationInfo[attr] = this.attr;
        this.emit('nationChanged', nationInfo);
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
  , name: 'Unnamica'
  , originalName: 'Unnamica'
  , demonym: 'Unnamican'
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
exports.Nation = Nation;

exports.create = function(game, properties) {
    var nation = new Nation(game, properties);
    if (!properties.people) nation.spawnInitialPeople();
    game.saveNation(nation);
    return nation;
}

function randomName(game) {
    var name, nations, names = require('../data/countries.json')
    if (game) nations = Object.keys(game.nations).map(function(uid) {return game.nations[uid]});
    var nameMatches = function(nation) {
        return nation.name === name.name || nation.originalName === name.name;
    }
    for (var i = 0; i < names.length; i++) {
        name = names[Math.floor(Math.random() * names.length * 0.999)];
        if (!nations || !nations.some(nameMatches)) return name;
    }
}
exports.randomName = randomName;


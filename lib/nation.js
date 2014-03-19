var extend = require('extend')
  , EventEmitter = require('events').EventEmitter
  , Ctor = require('./ctor')
  , genUid = require('./uid').genUid
  , object = require('./object')
  , unit = require('./unit');

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
            if (object.isA(obj, 'unit') && obj.nationUid === nation.uid) {
                nation.emit('unitChanged', obj);
            }
        });
    }

    /*
     * Spawn a unit for a nation
     */
    this.spawn = function(type, nearLocation) {
        var newUnit = object.create(type)
          , placed = unit.place(newUnit, this._game, nearLocation || this.startLocation, this.avoid);
        if (placed) {
            this.units.push(newUnit.uid);
            newUnit.nationUid = this.uid;
            this._game.objectChanged(newUnit);
            this._game.nationChanged(this);
            return newUnit;
        }
    }

    /*
     * Spawn the initial units for a nation
     */
    this.spawnInitialUnits = function() {
        var avoid = this.avoid = {};
        for (var i = 0; i < this._game.info.initialNationPop; i++) {
            var unit = this.spawn('unit');
            if (unit) {
                var x = unit.location[0]
                  , y = unit.location[1];
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
  , units: []
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
    if (!properties.units) nation.spawnInitialUnits();
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


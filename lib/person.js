var grid = require('./grid')
  , object = require('./object')
  , sight = require('./sight')
  , log = require('./logging').log;

exports.create = function create(bonusTraitCount) {
    var person = object.create('person', {
        maxHp: 10
      , hpRegen: 1
      , maxStamina: 4
      , maxSpeed: 3
      , staminaRegen: 3 
      , sight: 3
      , intellect: 1
      , influence: 1
      , craftiness: 1
      , baseHappiness: 0
      , tilesSeen: {}
      , objectsSeen: {}
      , happenings: []
      , bonusTraits: chooseBonusTraits(bonusTraitCount)
      , items: []
      , equipment: []
      , skills: {}
    });
    Object.keys(person.bonusTraits).forEach(function(trait) {
        bonusTraitModifiers[trait](person);
    });
    person.hp = person.maxHp;
    person.stamina = person.maxStamina;
    person.happiness = person.baseHappiness;
    return person;
}

var bonusTraitModifiers = {
    strong: function(person) {
        person.staminaRegen++;
    },
    fast: function(person) {
        person.maxStamina++;
        person.maxSpeed++;
    },
    intelligent: function(person) {
        person.intellect *= 1.5;
    },
    resilient: function(person) {
        person.maxHp += 3;
    },
    healthy: function(person) {
        person.hpRegen++;
    },
    perceptive: function(person) {
        person.sight++;
    },
    charismatic: function(person) {
        person.influence++;
    },
    crafty: function(person) {
        person.craftiness *= 1.5;
    }
};

var traits = Object.keys(bonusTraitModifiers);
exports.TRAITS = traits;

var randomTrait = function() {
    return traits[Math.floor(Math.random() * 0.999 * traits.length)];
}

var chooseBonusTraits = function(count) {
    var traitsChosen = {};
    while (count > 0) {
        var trait = randomTrait();
        if (!(trait in traitsChosen)) {
            traitsChosen[trait] = true;
            count--;
        }
    }
    return traitsChosen;
}

/*
 * Place a person in the game in a suitable location on or near the
 * location specified. If a suitable location cannot be found,
 * the person is not placed, and false is returned. The location
 * specified must be on land.
 */
function place(person, game, nearLocation, avoidLocations) {
    var goodBiomes = {grassland:true, plains:true, forest:true, taiga:true}
      , startX = nearLocation[0]
      , startY = nearLocation[1]
      , visited = 0
      , shouldAvoid
      , placed = false;
    while (!placed && visited < 100) {
        grid.visitRandomWalk(startX, startY, 20, function(x, y) {
            shouldAvoid = avoidLocations && avoidLocations[[x,y]];
            var tile = game.tile(x, y);
            if (!shouldAvoid && tile && tile.biome && goodBiomes[tile.biome]) {
                var objs = game.objectsAtLocation(tile);
                if (!objs.some(function(obj) {return obj.type == 'person'})) {
                    game.placeObject(person, tile);
                    placed = true;
                    return false;
                }
            }
            visited++;
            return tile.isLand;
        });
    }
    return placed;
}
exports.place = place;

function nationalOnly(propName) {
    return function(person, client) {
        if (client && person.nationUid == client.nation.uid) return person[propName];
    }
}

object.define('person', 
    {
        turnBegins: function(game) {
            sight.look(this, game);
        }
      , sees: function(game, tile, looking) {
            if (looking || this.tilesSeen[tile.key]) {
                var person = this
                  , nation = game.nations[this.nationUid];
                this.tilesSeen[tile.key] = tile;
                tile.objects.forEach(function(obj) {
                    if (obj.uid != person.uid) person.objectsSeen[obj.uid] = obj;
                });
                if (nation) nation.rememberTile(tile);
                game.objectChanged(person);
            } 
        }
      , move: function(game, fromLocation, toLocation) {
            var dx = toLocation[0] - fromLocation[0]
              , dy = toLocation[1] - fromLocation[1];
            if (fromLocation[0] != this.location[0] || fromLocation[1] != this.location[1]
                || Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                log.error('Invalid move person: person.location', this.location, 
                    'client from', fromLocation, 'client to', toLocation);
                throw new Error('invalidArgument');
            }
            game.placeObject(this, toLocation);
            sight.look(this, game);
        }
    }
  , {
        hp: true
      , maxHp: true
      , stamina: true
      , maxStamina: true
      , equipment: true
      , items: true
      , nationUid: true
      , bonusTraits: nationalOnly('bonusTraits')
      , tilesSeen: nationalOnly('tilesSeen')
      , skills: nationalOnly('skills')
    }
);




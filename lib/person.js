var grid = require('./grid');

exports.create = function(game, bonusTraitCount) {
    var person = game.createObject('person', {
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
function placePerson(person, game, nearLocation) {
    var goodBiomes = {grassland:true, plains:true, forest:true, taiga:true}
      , startX = nearLocation[0]
      , startY = nearLocation[1]
      , visited = 0
      , placed = false;
    while (!placed && visited < 100) {
        grid.visitRandomWalk(startX, startY, 20, function(x, y) {
            var tile = game.tile(x, y);
            if (tile && tile.biome && goodBiomes[tile.biome]) {
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
exports.placePerson = placePerson;

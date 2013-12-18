var grid = require('./grid')
  , object = require('./object');

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
      , tileSeen: {}
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
function place(person, game, nearLocation) {
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
exports.place = place;

object.define('person', {
    turnBegins: function(game) {
        see(this, game);
        game.saveObject(this);
    }
  , sees: function(game, object) {
        var objects = game.objectsAtLocation(this.location)
          , tileSeen = this.tilesSeen[this.location];
        if (tileSeen) {
            tileSeen.objects = objects.slice();
        }
        game.saveObject(this);
    }
});

function see(person, game) {
    var turn = game.info.turnNumber;
    sightFrom(game, person.location, person.sight, function(tile, elev, tileKey) {
        var objects = game.iSee(person, tile);
        person.tilesSeen[tileKey] = {
            terrain: tile.terrain
          , biome: tile.biome
          , isLand: tile.isLand
          , type: tile.type
          , objects: objects.slice()
          , turn: turn
        };
        person.happenings.push({
            what: 'saw'
          , subject: object
          , turn: turn
        });
    });
}
exports.see = see;

var terrainSightElevations = {
    ocean: -1, coast: -1, flat: 0, hill: 1, mountain: 2
};
var biomeSightModifiers = {
    forest: {from: 0, through: 1}
  , taiga: {from: 0, through: 1}
  , jungle: {from: 0, through: 2}
  , glacier: {from: 0, through: 1}
  , river: {from: -1, through: -1}
  , marsh: {from: -1, through: 0}
};

function sightFrom(game, location, radius, visitFunc) {
    var cx = location[0]
      , cy = location[1]
      , centerTile = game.tile(cx, cy)
      , startElev = terrainSightElevations[centerTile.terrain],
        seen = {};
    if (biomeSightModifiers[centerTile.biome]) {
        startElev += biomeSightModifiers[centerTile.biome].from;
    }

    grid.visitRangeBounds(cx, cy, radius, function(x, y) {
        grid.visitRayTrace(cx, cy, x, y, function(tx, ty) {
            var tile = game.tile(tx, ty);
            if (!tile) return false;
            var tileKey = tx + ',' + ty
              , elev = terrainSightElevations[tile.terrain];
            if (biomeSightModifiers[tile.biome]) {
                elev += biomeSightModifiers[tile.biome].through;
            }
            if (!seen[tileKey]) {
                visitFunc(tile, elev, tileKey);
                seen[tileKey] = true;
            }
            return (cx == tx && cy == ty) || startElev >= elev;
        });
    });
}
exports.sightFrom = sightFrom;



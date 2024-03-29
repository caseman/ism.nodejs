var assert = require('assert')
  , sinon = require('sinon')
  , testGame = sinon.mock();

suite('person.create', function() {
    var person = require('../lib/person')
      , regularJoe = person.create(0);

    var traitCount = function(person) {
        return Object.keys(person.bonusTraits).length;
    }

    test('Regular joe has no bonus traits', function() {
        assert(traitCount(regularJoe) === 0, 'should not have bonus traits');
    });

    test('Intelligent folks have higher intellect', function() {
        do {
            var smarty = person.create(1);
            assert.equal(traitCount(smarty), 1, 'should have one bonus trait');
        } while (!smarty.bonusTraits.intelligent);
        assert(smarty.intellect > regularJoe.intellect);
    });

    test('Strong folks have higher stamina regen', function() {
        do {
            var pumped = person.create(1);
            assert.equal(traitCount(pumped), 1, 'should have one bonus trait');
        } while (!pumped.bonusTraits.strong);
        assert(pumped.staminaRegen > regularJoe.staminaRegen);
    });

    test('Resilient folks have higher hp', function() {
        do {
            var dude = person.create(1);
            assert.equal(traitCount(dude), 1, 'should have one bonus trait');
        } while (!dude.bonusTraits.resilient);
        assert(dude.hp > regularJoe.hp);
    });

    test('Healthy folks have higher hp regen', function() {
        do {
            var dude = person.create(1);
            assert.equal(traitCount(dude), 1, 'should have one bonus trait');
        } while (!dude.bonusTraits.healthy);
        assert(dude.hpRegen > regularJoe.hpRegen);
    });

    test('Fast folks have higher stamina and speed', function() {
        do {
            var dude = person.create(1);
            assert.equal(traitCount(dude), 1, 'should have one bonus trait');
        } while (!dude.bonusTraits.fast);
        assert(dude.maxSpeed > regularJoe.maxSpeed);
        assert(dude.stamina > regularJoe.stamina);
    });

    test('Perceptive folks have higher sight', function() {
        do {
            var dude = person.create(1);
            assert.equal(traitCount(dude), 1, 'should have one bonus trait');
        } while (!dude.bonusTraits.perceptive);
        assert(dude.sight > regularJoe.sight);
    });

    test('Crafty folks have higher craftiness', function() {
        do {
            var dude = person.create(1);
            assert.equal(traitCount(dude), 1, 'should have one bonus trait');
        } while (!dude.bonusTraits.crafty);
        assert(dude.craftiness > regularJoe.craftiness);
    });

    test('Charismatic folks have higher influence', function() {
        do {
            var dude = person.create(1);
            assert.equal(traitCount(dude), 1, 'should have one bonus trait');
        } while (!dude.bonusTraits.charismatic);
        assert(dude.influence > regularJoe.influence);
    });

    test('Multiple bonus traits', function() {
        var dude = person.create(3);
        assert.equal(traitCount(dude), 3, 'should have three bonus trait');
    });

    test('Person starts with full hp and stamina', function() {
        var dude = person.create(0);
        assert.equal(dude.hp, dude.maxHp, 'should start with max hp');
        assert.equal(dude.stamina, dude.maxStamina, 'should start with max hp');
    });

});

var tile = testGame.tile = function(x, y) {
    var terrains = ['ocean', 'flat', 'mountain', 'hill']
      , biomes = ['desert', 'forest', 'plains', 'grassland', 'taiga', 'river']
      , terrain = terrains[Math.floor((x + y) / biomes.length) % terrains.length]
      , hasBiome = terrain == 'flat' || terrain == 'hill'
      , biome = hasBiome ? biomes[(x + y) % biomes.length] : undefined;
    return {
        x: x
      , y: y
      , terrain: terrain
      , biome: biome
      , isLand: terrain != 'ocean'
    };
}

suite('person.place', function() {
    var person = require('../lib/person')
      , testPerson = person.create(0);

    test('places people on suitable terrain only', function() {
        var places = 0
          , expectedPlaces = 0
          , goodBiomes = {grassland:true, plains:true, forest:true, taiga:true};

        testGame.objectsAtLocation = function() {return []}
        testGame.placeObject = function(obj, tile) {
            assert.strictEqual(obj, testPerson);
            assert(goodBiomes[tile.biome]);
            places++;
        }

        for (var i = 0; i < 100; i++) {
            var placed = person.place(testPerson, testGame, [i, i*2]);
            if (placed) expectedPlaces++;
        }
        assert(expectedPlaces > 0);
        assert.equal(places, expectedPlaces);
    });

    test('will not place on tile with another person', function() {
        var places = 0
          , expectedPlaces = 0;

        testGame.objectsAtLocation = function(loc) {
            if ((loc.x + loc.y) % 3) return [{type:'person'}]
            return []
        }
        testGame.placeObject = function(obj, tile) {
            assert.strictEqual(obj, testPerson);
            assert.deepEqual(testGame.objectsAtLocation(tile), []);
            places++;
        }

        for (var i = 0; i < 100; i++) {
            var placed = person.place(testPerson, testGame, [i, i*2]);
            if (placed) expectedPlaces++;
        }
        assert(expectedPlaces > 0);
        assert.equal(places, expectedPlaces);
    });

    test('will not place on tile in locations specified to avoid', function() {
        var places = 0
          , avoid = {}

        testGame.placeObject = function(obj, tile) {
            assert.strictEqual(obj, testPerson);
            assert(!avoid[testPerson.location]);
        }

        for (var i = 0; i < 100; i++) {
            avoid[[i, i*2]] = true
            var placed = person.place(testPerson, testGame, [i, i*2], avoid);
            if (placed) places++;
        }
        assert(places > 0);
    });

    var createTileStrip = function(stripTerrain) {
        var isLand = (stripTerrain != 'ocean' && stripTerrain != 'coast')
        testGame.objectsAtLocation = function() {return []}
        testGame.tile = function(x, y) {
            if (x == 102) {
                return {
                    terrain: stripTerrain
                  , x: x
                  , y: y
                  , isLand: isLand
                  , isWater: !isLand || stripTerrain == 'river'
                };
            } else if (x == 101) {
                return {
                    terrain: 'flat'
                  , biome: 'desert'
                  , x: x
                  , y: y
                  , isLand: true
                };
            } else {
                return {
                    terrain: 'flat'
                  , biome: 'plains'
                  , x: x
                  , y: y
                  , isLand: true
                };
            }
        }
    }

    test('will not cross ocean from location', function() {
        var places = 0
          , expectedPlaces = 0;

        createTileStrip('ocean');
        testGame.placeObject = function(obj, tile) {
            assert.strictEqual(obj, testPerson);
            assert(tile.x < 101);
            places++;
        }
        for (var i = 0; i < 100; i++) {
            var placed = person.place(testPerson, testGame, [101, i*2]);
            if (placed) expectedPlaces++;
        }
        assert(expectedPlaces > 0);
        assert.equal(places, expectedPlaces);

        testGame.tile = tile;
    });

    test('will not cross mountain from location', function() {
        var places = 0
          , expectedPlaces = 0;

        createTileStrip('mountain');
        testGame.placeObject = function(obj, tile) {
            assert.strictEqual(obj, testPerson);
            assert(tile.x < 101);
            places++;
        }
        for (var i = 0; i < 100; i++) {
            var placed = person.place(testPerson, testGame, [101, i*2]);
            if (placed) expectedPlaces++;
        }
        assert(expectedPlaces > 0);
        assert.equal(places, expectedPlaces);

        testGame.tile = tile;
    });

    test('will not cross river from location', function() {
        var places = 0
          , expectedPlaces = 0;

        createTileStrip('river');
        testGame.placeObject = function(obj, tile) {
            assert.strictEqual(obj, testPerson);
            assert(tile.x < 101);
            places++;
        }
        for (var i = 0; i < 100; i++) {
            var placed = person.place(testPerson, testGame, [101, i*2]);
            if (placed) expectedPlaces++;
        }
        assert(expectedPlaces > 0);
        assert.equal(places, expectedPlaces);

        testGame.tile = tile;
    });

});









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
        assert(traitCount(regularJoe) == 0, 'should not have bonus traits');
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

        testGame.objectsAtLocation = function(loc) {return []}
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

    test('will not cross ocean from location', function() {
        var places = 0
          , expectedPlaces = 0;

        testGame.objectsAtLocation = function(loc) {return []}
        testGame.tile = function(x, y) {
            if (x == 100) {
                return {
                    terrain: 'ocean'
                  , x: x
                  , y: y
                  , isLand: false
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

        testGame.placeObject = function(obj, tile) {
            assert.strictEqual(obj, testPerson);
            assert(tile.x > 101);
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

suite('person sight', function() {
    var person = require('../lib/person');

    this.beforeEach(function() {
        testGame.info = {turnNumber: 33};
        testGame.tile = sinon.spy(function(x, y) {
            return {
                x: x
              , y: y
              , terrain: 'flat'
              , biome: 'grassland'
              , type: 'flat-grassland'
              , isLand: true
            };
        });
    });

    test('sees surrounding tiles', function() {
        var testPerson = person.create(0);
        testPerson.location = [5,3];
        testPerson.sight = 2;
        testGame.iSee = sinon.spy(function(person, tile) {
            assert.strictEqual(person, testPerson);
            assert.equal(tile.type, 'flat-grassland');
            return [];
        });

        person.see(testPerson, testGame);
        assert.equal(testGame.iSee.callCount, 25);
        for (var y = 1; y <= 5; y++) {
            for (var x = 3; x <= 7; x++) {
                assert(testGame.iSee.calledWith(testPerson, testGame.tile(x, y)), [x, y]);
                var tileSeen = testPerson.tilesSeen[[x, y]];
                assert(tileSeen, [x, y]);
                assert.equal(tileSeen.x, x);
                assert.equal(tileSeen.y, y);
                assert.equal(tileSeen.type, 'flat-grassland');
                assert.equal(tileSeen.turn, testGame.info.turnNumber);
            }
        }
    });

    test('sees objects in surrounding tiles', function() {
        var testPerson = person.create(0);
        testPerson.location = [2,8];
        testPerson.sight = 1;

        var objects = {
            '1,8': [{uid:1}, {uid:2}]
          , '0,7': [{uid:-2}, {uid:-1}]
          , '2,8': [{uid:3}]
          , '2,9': [{uid:4}, {uid:5}]
          , '3,7': [{uid:6}]
          , '4,8': [{uid:-3}]
          , '2,10': [{uid:-4}, {uid:-5}]
        };
        testGame.iSee = sinon.spy(function(person, tile) {
            return objects[tile.x + ',' + tile.y] || [];
        });

        person.see(testPerson, testGame);
        assert.equal(testGame.iSee.callCount, 9);
        assert.deepEqual(testPerson.tilesSeen['1,8'].objects, objects['1,8']);
        assert.deepEqual(testPerson.tilesSeen['0,7'], undefined);
        assert.deepEqual(testPerson.tilesSeen['2,8'].objects, objects['2,8']);
        assert.deepEqual(testPerson.tilesSeen['2,9'].objects, objects['2,9']);
        assert.deepEqual(testPerson.tilesSeen['3,7'].objects, objects['3,7']);
        assert.deepEqual(testPerson.tilesSeen['4,8'], undefined);
        assert.deepEqual(testPerson.tilesSeen['2,10'], undefined);
    });

});









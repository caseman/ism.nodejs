var assert = require('assert');

suite('createPerson', function() {
    var createPerson = require('../lib/person').createPerson;
    var regularJoe = createPerson({}, 0);

    var traitCount = function(person) {
        return Object.keys(person.bonusTraits).length
    }

    test('Regular joe has no bonus traits', function() {
        assert(traitCount(regularJoe) == 0, 'should not have bonus traits');
    });

    test('Intelligent folks have higher intellect', function() {
        do {
            var smarty = createPerson({}, 1);
            assert.equal(traitCount(smarty), 1, 'should have one bonus trait');
        } while (!smarty.bonusTraits.intelligent);
        assert(smarty.intellect > regularJoe.intellect);
    });

    test('Strong folks have higher stamina regen', function() {
        do {
            var pumped = createPerson({}, 1);
            assert.equal(traitCount(pumped), 1, 'should have one bonus trait');
        } while (!pumped.bonusTraits.strong);
        assert(pumped.staminaRegen > regularJoe.staminaRegen);
    });

    test('Resilient folks have higher hp', function() {
        do {
            var dude = createPerson({}, 1);
            assert.equal(traitCount(dude), 1, 'should have one bonus trait');
        } while (!dude.bonusTraits.resilient);
        assert(dude.hp > regularJoe.hp);
    });

    test('Healthy folks have higher hp regen', function() {
        do {
            var dude = createPerson({}, 1);
            assert.equal(traitCount(dude), 1, 'should have one bonus trait');
        } while (!dude.bonusTraits.healthy);
        assert(dude.hpRegen > regularJoe.hpRegen);
    });

    test('Fast folks have higher stamina and speed', function() {
        do {
            var dude = createPerson({}, 1);
            assert.equal(traitCount(dude), 1, 'should have one bonus trait');
        } while (!dude.bonusTraits.fast);
        assert(dude.maxSpeed > regularJoe.maxSpeed);
        assert(dude.stamina > regularJoe.stamina);
    });

    test('Perceptive folks have higher sight', function() {
        do {
            var dude = createPerson({}, 1);
            assert.equal(traitCount(dude), 1, 'should have one bonus trait');
        } while (!dude.bonusTraits.perceptive);
        assert(dude.sight > regularJoe.sight);
    });

    test('Crafty folks have higher craftiness', function() {
        do {
            var dude = createPerson({}, 1);
            assert.equal(traitCount(dude), 1, 'should have one bonus trait');
        } while (!dude.bonusTraits.crafty);
        assert(dude.craftiness > regularJoe.craftiness);
    });

    test('Charismatic folks have higher influence', function() {
        do {
            var dude = createPerson({}, 1);
            assert.equal(traitCount(dude), 1, 'should have one bonus trait');
        } while (!dude.bonusTraits.charismatic);
        assert(dude.influence > regularJoe.influence);
    });

    test('Multiple bonus traits', function() {
        var dude = createPerson({}, 3);
        assert.equal(traitCount(dude), 3, 'should have three bonus trait');
    });

});

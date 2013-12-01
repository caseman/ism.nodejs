
exports.createPerson = function(game, bonusTraitCount, nearLocation) {
    var person = {
        maxHp: 10,
        hpRegen: 1,
        maxStamina: 4,
        maxSpeed: 3,
        staminaRegen: 3, 
        sight: 3,
        intellect: 1,
        influence: 1,
        craftiness: 1,
        baseHappiness: 0,
        happenings: [],
        bonusTraits: chooseBonusTraits(bonusTraitCount),
        items: [],
        equipment: [],
        skills: {},
    }
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

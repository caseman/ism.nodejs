var assert = require('assert')
  , sinon = require('sinon')
  , game = require('../lib/game')
  , person = require('../lib/person');

suite('nation', function() {
    var nation = require('../lib/nation');

    this.beforeEach(function() {
        this.sinon = sinon.sandbox.create();
        this.game = new game.Game();
        this.game.info = {initialNationPop: 4, turnNumber: 99};
        this.game.db = {put: function(){}};
        this.gameMock = this.sinon.mock(this.game);
        this.personMock = this.sinon.mock(person);
    });

    this.afterEach(function() {
        this.gameMock.verify();
        this.personMock.verify();
        this.sinon.restore();
    });

    test('create saves nation', function() {
        this.sinon.stub(person, 'create');
        this.sinon.stub(person, 'place');
        var saveNation = this.gameMock.expects('saveNation').once();
        var testNation = nation.create(this.game, {startLocation: [0,0]});
        assert(testNation.uid);
        saveNation.calledWith(testNation);
        assert.deepEqual(testNation.startLocation, [0,0]);
    });

    test('create spawns folks', function() {
        var initialPop = this.game.info.initialNationPop;
        var testPerson = {type:'person', uid:'33242', location:[5,9]};
        this.personMock.expects('create').exactly(initialPop).returns(testPerson);
        this.personMock.expects('place').exactly(initialPop).returns(true);
        this.gameMock.expects('objectChanged').atLeast(initialPop).withArgs(testPerson);
        this.gameMock.expects('nationChanged').atLeast(1);

        var testNation = nation.create(this.game, {startLocation: [5,10]});
        assert.equal(testNation.people.length, initialPop);
    });

    test('spawn creates person and saves', function() {
        var testNation = nation.create(this.game, {startLocation: [5,10], people:[]});
        var testPerson = {type:'person', uid:'2578'};
        this.game.info = {turnNumber: 99};
        this.personMock.expects('create').once().returns(testPerson);
        this.personMock.expects('place').once().returns(true);
        this.gameMock.expects('objectChanged').once().withArgs(testPerson);
        testNation.spawn(this.game, testNation, [8,9]);
        assert.equal(testPerson.nationUid, testNation.uid);
        assert.deepEqual(testNation.people, [testPerson.uid]);
        assert.equal(testNation.lastSpawn, this.game.info.turnNumber);
    });

    test('name, originalName, demonym gets assigned', function() {
        this.sinon.stub(person, 'create');
        this.sinon.stub(person, 'place');
        this.game.nations = {};
        var testNation = nation.create(this.game, {startLocation: [15,10]});
        assert.notEqual(testNation.name, nation.Nation.defaults.name);
        assert.notEqual(testNation.originalName, nation.Nation.defaults.originalName);
        assert.strictEqual(testNation.name, testNation.originalName);
        assert.notEqual(testNation.demonym, nation.Nation.defaults.demonym);
    });

    test('random name', function() {
        for (var i = 0; i < 100; i++) {
            var name = nation.randomName()
            assert(name.name);
            assert(name.demonym);
            assert(name.cities);
        }
    })

    test('random names unique for game', function() {
        var seen = {}
          , nations = {}
        this.game.nations = nations;
        for (var i = 0; i < 20; i++) {
            var name = nation.randomName(this.game);
            assert(!seen[name.name], name.name);
            seen[name.name] = true;
            nations[i] = {
                name: name.name
              , originalName: name.name
              , demonym: name.demonym
            }
        }
    })

});


var assert = require('assert')
  , sinon = require('sinon')
  , game = require('../lib/game')
  , object = require('../lib/object')
  , unit = require('../lib/unit');

suite('nation', function() {
    var nation = require('../lib/nation');

    this.beforeEach(function() {
        this.sinon = sinon.sandbox.create();
        this.game = new game.Game();
        this.game.info = {initialNationPop: 4, turnNumber: 99};
        this.game.db = {put: function(){}};
        this.gameMock = this.sinon.mock(this.game);
        this.unitMock = this.sinon.mock(unit);
        this.objectMock = this.sinon.mock(object);
    });

    this.afterEach(function() {
        this.gameMock.verify();
        this.unitMock.verify();
        this.objectMock.verify();
        this.sinon.restore();
    });

    test('create saves nation', function() {
        this.sinon.stub(unit, 'place');
        var saveNation = this.gameMock.expects('saveNation').once();
        var testNation = nation.create(this.game, {startLocation: [0,0]});
        assert(testNation.uid);
        saveNation.calledWith(testNation);
        assert.deepEqual(testNation.startLocation, [0,0]);
    });

    test('create spawns folks', function() {
        var initialPop = this.game.info.initialNationPop;
        var testUnit = {type:'unit', uid:'33242', location:[5,9]};
        this.objectMock.expects('create').exactly(initialPop).returns(testUnit);
        this.unitMock.expects('place').exactly(initialPop).returns(true);
        this.gameMock.expects('objectChanged').atLeast(initialPop).withArgs(testUnit);
        this.gameMock.expects('nationChanged').atLeast(1);

        var testNation = nation.create(this.game, {startLocation: [5,10]});
        assert.equal(testNation.units.length, initialPop);
    });

    test('spawn creates unit and saves', function() {
        var testNation = nation.create(this.game, {startLocation: [5,10], units:[]});
        var testUnit = {type:'unit', uid:'2578'};
        this.game.info = {turnNumber: 99};
        this.objectMock.expects('create').once().returns(testUnit);
        this.unitMock.expects('place').once().returns(true);
        this.gameMock.expects('objectChanged').once().withArgs(testUnit);
        testNation.spawn(this.game, testNation, [8,9]);
        assert.equal(testUnit.nationUid, testNation.uid);
        assert.deepEqual(testNation.units, [testUnit.uid]);
    });

    test('name, originalName, demonym gets assigned', function() {
        this.sinon.stub(object, 'create');
        this.sinon.stub(unit, 'place');
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


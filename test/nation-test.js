var assert = require('assert')
  , sinon = require('sinon')
  , game = require('../lib/game')
  , person = require('../lib/person');

suite('nation', function() {
    var nation = require('../lib/nation');

    this.beforeEach(function() {
        this.sinon = sinon.sandbox.create();
        this.game = new game.Game;
        this.game.info = {initialNationPop: 4, turnNumber: 99};
        this.gameMock = this.sinon.mock(this.game);
        this.personMock = this.sinon.mock(person);
    });

    this.afterEach(function() {
        this.gameMock.verify();
        this.personMock.verify();
        this.sinon.restore();
    });

    test('create saves nation', function() {
        this.sinon.stub(nation, 'spawn')
        var saveNation = this.gameMock.expects('saveNation').once();
        var testNation = nation.create(this.game, [0,0]);
        assert(testNation.uid);
        saveNation.calledWith(testNation);
        assert.deepEqual(testNation.startLocation, [0,0]);
    });

    test('create spawns folks', function() {
        var spawn = this.sinon.stub(nation, 'spawn');
        this.gameMock.expects('saveNation').once();
        var testNation = nation.create(this.game, [5,10]);
        assert.equal(spawn.callCount, this.game.info.initialNationPop);
        assert(spawn.calledWith(this.game, testNation));
    });

    test('spawn creates person and saves', function() {
        var testNation = {uid:'344', lastSpawn:null, people:[]};
        var testPerson = {type:'person', uid:'2578'};
        this.game.info = {turnNumber: 99};
        this.personMock.expects('create').once().returns(testPerson);
        this.personMock.expects('placePerson').once().returns(true);
        this.gameMock.expects('saveObject').once().withArgs(testPerson);
        nation.spawn(this.game, testNation, [8,9]);
        assert.equal(testPerson.nationUid, testNation.uid);
        assert.deepEqual(testNation.people, [testPerson.uid]);
        assert.equal(testNation.lastSpawn, this.game.info.turnNumber);
    });

});


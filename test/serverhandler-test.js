var assert = require('chai').assert;
var sinon = require('sinon');
var Server = require('../lib/server').Server;

var MockConn = function() {
    this.remoteAddress = '1.2.3.4',
    this.remotePort = 5557,
    this.close = sinon.stub();
}

var MockClient = function(conn) {
    this.conn = conn;
    this.joinGame = function(){};
    this.send = function(){};
    this.sendError = function(){};
}

var before = function() {
    this.sinon = sinon.sandbox.create();
    var db = {get: sinon.spy()};
    this.server = new Server(db);
    this.serverMock = this.sinon.mock(this.server);
    this.conn = new MockConn;
    this.client = new MockClient(this.conn);
    this.clientMock = this.sinon.mock(this.client);
}
var after = function() {
    this.serverMock.verify();
    this.clientMock.verify();
    this.sinon.restore();
}

suite('general handler', function() {
    var handle = require('../lib/serverhandler').handle;

    this.beforeEach(before);
    this.afterEach(after);

    test('unhandled msg returns false', function() {
        this.clientMock.expects('send').never();
        var handled = handle(this.server, this.client, {says:'whyioughtta', uid:'123'});
        assert(!handled);
        assert(!this.conn.close.called);
    });
});

suite('hi handler', function() {
    var handle = require('../lib/serverhandler').handle;
    var version = require('../package.json').version;

    this.beforeEach(before);
    this.afterEach(after);

    test('successful with new client', function() {
        this.clientMock.expects('sendError').never();
        var send = this.clientMock.expects('send').once();

        var handled = handle(this.server, this.client, 
            {says:'hi', clientVersion:version, uid:'012'});
        assert(handled);
        assert(!this.conn.close.called, 'Connection should not be closed');
        var reply = send.firstCall.args[0];
        assert.equal(reply.says, 'hi');
        assert.equal(reply.re, '012');
        assert(reply.cid);
    });

    test('sends error with mismatched client version and closes conn', function() {
        var msg = {says:'hi', clientVersion:'whateva', uid:'42'}
        this.clientMock.expects('sendError').once()
            .withArgs('incompatibleClientVersion', msg);
        var handled = handle(this.server, this.client, msg);
        assert(handled);
        assert(this.conn.close.called, 'Connection should be closed');
    });

    test('sends error when no cid issued and closes conn', function() {
        this.serverMock.expects('registerClient').once().withArgs(this.client).returns(false);
        var msg = {says:'hi', clientVersion:version, uid:'96'}
        this.clientMock.expects('sendError').once().withArgs('tooManyConnections', msg);
        var handled = handle(this.server, this.client, msg);
        assert(handled);
        assert(this.conn.close.called, 'Connection should be closed');
    });

    test('successful with reconnecting client', function() {
        this.client.cid = '888';
        this.server.clients[this.client.cid] = this.client;
        this.clientMock.expects('sendError').never();
        this.clientMock.expects('send').once()
            .withArgs({says:'hi', cid:this.client.cid, re:'357'});

        var handled = handle(this.server, this.client, 
            {says:'hi', clientVersion:version, cid:this.client.cid, uid:'357'});
        assert(handled);
        assert(!this.conn.close.called, 'Connection should not be closed');
    });

});

suite('games handler', function() {
    var handle = require('../lib/serverhandler').handle
      , game = require('../lib/game');

    this.beforeEach(before);
    this.afterEach(after);

    test('returns game list', function() {
        var games = [{uid:1}, {uid:2}, {uid:3}];
        this.sinon.stub(game, 'list', function(db, cb) {
            cb(null, games);
        });
        this.clientMock.expects('sendError').never();
        this.clientMock.expects('send').once()
            .withArgs({says:'games', re:'451', list:games});

        var handled = handle(this.server, this.client, {says:'games', uid:'451'});
        assert(handled);
    });

    test('reports error', function() {
        this.sinon.stub(game, 'list', function(db, cb) {
            cb(new Error('Yipes!'));
        });
        var msg = {says:'games', uid:'890'}
        this.clientMock.expects('sendError').once()
            .withArgs('unexpectedError', msg);
        var handled = handle(this.server, this.client, msg);
        assert(handled);
    });

});

suite('createGame handler', function() {
    var handle = require('../lib/serverhandler').handle
      , game = require('../lib/game')
      , map = require('../lib/map');

    this.beforeEach(before);
    this.afterEach(after);

    test('makes a game', function() {
        var testMap = {}
          , testGame = {uid:999, info:{uid: 999}}
          , mapParams = {width: 1024, height: 1024};
        this.sinon.stub(game, 'create', function(db, map, params, cb) {
            assert.strictEqual(map, testMap);
            cb(null, testGame);
        });
        this.sinon.stub(map, 'create', function(params, progressCb) {
            assert.deepEqual(params, mapParams);
            assert.isFunction(progressCb);
            return testMap;
        });
        this.clientMock.expects('sendError').never();
        this.clientMock.expects('send').once()
            .withArgs({says:'createGame', re:'261', game:testGame.info});

        var handled = handle(this.server, this.client, 
            {says:'createGame', uid:'261', mapParams:mapParams});
        assert(handled);
        assert.strictEqual(this.server.games[testGame.uid], testGame);
    });

    test('rejects huge maps', function() {
        var msg = {says:'createGame', uid:'105', mapParams:{width:10000, height:10000}};
        this.clientMock.expects('sendError').once()
            .withArgs('mapTooLarge', msg);
        var handled = handle(this.server, this.client, msg);
        assert(handled);
    });

    /* can't test this until map creation is async
    test('map can time out', function(done) {
        var msg = {says:'createGame', uid:'105', mapParams:{width:1000, height:1000}}
          , server = this.server
          , conn = this.client;
        this.sinon.stub(map, 'create', function(params, progressCb) {
            while (true) progressCb();
        });
        this.server.timeout = 1;
        this.clientMock.expects('sendError').once()
            .withArgs('timeout', msg);
        setImmediate(function() {
            var handled = handle(server, conn, msg);
            assert(handled);
            done();
        });
    });
    */

    test('has an error', function() {
        var testGame = {info:{uid: 999}}
          , mapParams = {width: 100, height: 100};
        this.sinon.stub(game, 'create', function(db, map, params, cb) {
            cb(new Error('owww'));
        });
        this.sinon.stub(map, 'create', function(params, progressCb) {
            return {};
        });

        var msg = {says:'createGame', uid:'105', mapParams:{width:512, height:512}};
        this.clientMock.expects('sendError').once()
            .withArgs('unexpectedError', msg);
        var handled = handle(this.server, this.client, msg);
        assert(handled);
    });

});

suite('join handler', function() {
    var handle = require('../lib/serverhandler').handle
      , game = require('../lib/game');

    this.beforeEach(before);
    this.afterEach(after);

    test('joins a game not started', function() {
        var testGame = new game.Game(null, "345908309")
          , gameMock = this.sinon.mock(testGame)
          , nation = {uid:"2304958"};
        this.serverMock.expects('requireRegisteredClient').once().withArgs(this.client);
        this.serverMock.expects('game').once().withArgs(testGame.uid).yields(null, testGame);
        gameMock.expects('started').returns(false);
        gameMock.expects('chooseNationForClient').once().withArgs(this.client).returns(nation);
        this.clientMock.expects('joinGame').once().withArgs(testGame);

        var handled = handle(this.server, this.client, 
            {says: 'join', game:testGame.uid, uid:"579"});
        assert(handled);
    });

    test('joins a started game', function() {
        var testGame = new game.Game(null, "2345098")
          , gameMock = this.sinon.mock(testGame)
          , nation = {uid:"23495873"}
          , people = [{uid:1}, {uid:2}, {uid:3}];
        nation.people = [1, 2, 3];
        testGame.objects = {1:people[0], 2:people[1], 3:people[2]};
        this.serverMock.expects('requireRegisteredClient').once().withArgs(this.client);
        this.serverMock.expects('game').once().withArgs(testGame.uid).yields(null, testGame);
        gameMock.expects('started').returns(true);
        gameMock.expects('chooseNationForClient').once().withArgs(this.client).returns(nation);
        this.clientMock.expects('joinGame').once().withArgs(testGame);

        var handled = handle(this.server, this.client, 
            {says: 'join', game:testGame.uid, uid:"435"});
        assert(handled);
    });

    test('cannot join full game', function() {
        var testGame = new game.Game(null, "2345979")
          , gameMock = this.sinon.mock(testGame);
        this.serverMock.expects('requireRegisteredClient').once().withArgs(this.client);
        this.serverMock.expects('game').once().withArgs(testGame.uid).yields(null, testGame);
        gameMock.expects('chooseNationForClient').once().withArgs(this.client).returns(undefined);
        var msg = {says: 'join', game:testGame.uid, uid:"289"};
        this.clientMock.expects('sendError').once().withArgs('cannotJoin', msg);

        var handled = handle(this.server, this.client, msg);
        assert(handled);
    });

    test('requires a registered client', function() {
        var testGame = new game.Game(null, "2345098");
        this.client.cid = undefined;
        this.serverMock.expects('game').never();
        assert.throws(function() {
            handle(this.server, this.client, {says: 'join', game:testGame.uid, uid:"999"});
        });
    });

    test('has an error', function() {
        var testGame = new game.Game(null, "2345979")
          , gameMock = this.sinon.mock(testGame);
        this.serverMock.expects('requireRegisteredClient').once().withArgs(this.client);
        this.serverMock.expects('game').once().withArgs(testGame.uid).yields(new Error, null);
        var msg = {says: 'join', game:testGame.uid, uid:"4587"};
        this.clientMock.expects('sendError').once().withArgs('unexpectedError', msg);

        var handled = handle(this.server, this.client, msg);
        assert(handled);
    });

});


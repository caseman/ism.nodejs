var assert = require('assert');
var util = require('util');
var events = require('events');
var sinon = require('sinon');
var key = require('../lib/db').key;

var MockConn = function() {
    events.EventEmitter.call(this);
    this.remoteAddress = '1.2.3.4',
    this.remotePort = 5557,
    this.write = sinon.stub();
}
util.inherits(MockConn, events.EventEmitter);

var MockDb = function() {
    this.get = function(){};
    this.put = function(){};
}
var MockGame = function(uid) {
    events.EventEmitter.call(this);
    this.uid = uid;
    this.db = new MockDb;
}
util.inherits(MockGame, events.EventEmitter);

suite('server', function() {
    var server = require('../lib/server');
    var handler = require('../lib/serverhandler');

    this.beforeEach(function() {
        var test = this;
        this.sinon = sinon.sandbox.create();
        db = new MockDb;
        this.dbMock = this.sinon.mock(db);
        this.server = new server.Server(db);
        this.conn = new MockConn;
        this.createClientStub = this.sinon.stub(server, 'createClient', function(conn) {
            test.client = new server.Client(conn);
            return test.client;
        });
        this.server.sockjsServer.emit('connection', this.conn);
        this.handleStub = this.sinon.stub(handler, 'handle');
    });

    this.afterEach(function(){
        this.dbMock.verify();
        this.sinon.restore();
    });

    function getReply(test) {
        assert(test.conn.write.called, 'expected server to reply');
        return JSON.parse(test.conn.write.lastCall.args[0]);
    }

    test('parse message and call handler', function() {
        this.handleStub.returns(true);

        this.conn.emit('data', '{"says": "foobar", "uid": "1234"}');

        assert(this.handleStub.calledOnce, 'handler was called');
        assert(this.handleStub.calledWith(
            this.server, this.client, {"says": "foobar", "uid": "1234"}));
        assert(!this.conn.write.called, 'Server should not write back');
    });

    test('unparsable message', function() {
        this.conn.emit('data', '{This is not pudding');

        assert(!this.handleStub.called, 'handler should not be called');
        var reply = getReply(this);
        assert.equal(reply.says, 'error', 'write back should be an error');
        assert.equal(reply.error, 'badMessage');
    });

    test('unhandled message', function() {
        this.handleStub.returns(false);

        this.conn.emit('data', '{"says": "boo", "uid": "1234"}');
        assert(this.handleStub.calledOnce, 'handler was called');
        var reply = getReply(this);
        assert.equal(reply.says, 'error', 'write back should be an error');
        assert.equal(reply.error, 'unhandledMessage');
        assert.equal(reply.re, '1234', 'write back should reference orig msg');
    });

    test('message missing "says"', function() {
        this.conn.emit('data', '{"uid": "1111"}');
        assert(!this.handleStub.called, 'handler not called');
        var reply = getReply(this);
        assert.equal(reply.says, 'error', 'write back should be an error');
        assert.equal(reply.error, 'incompleteMessage');
        assert.equal(reply.re, '1111', 'write back should reference orig msg');
    });

    test('message missing "uid"', function() {
        this.conn.emit('data', '{"says": "buhbye"}');
        assert(!this.handleStub.called, 'handler not called');
        var reply = getReply(this);
        assert.equal(reply.says, 'error', 'write back should be an error');
        assert.equal(reply.error, 'incompleteMessage');
    });

    test('server tolerates exception in handler', function() {
        this.handleStub.throws();

        this.conn.emit('data', '{"says": "foobar", "uid": "5678"}');
        assert(this.handleStub.calledOnce, 'handler was called');
        assert(this.handleStub.threw(), 'handler threw');
        var reply = getReply(this);
        assert.equal(reply.says, 'error', 'write back should be an error');
        assert.equal(reply.error, 'unexpectedError');
        assert.equal(reply.re, '5678', 'write back should reference orig msg');

        // Server should process next message just fine
        this.handleStub.reset();
        this.handleStub.returns(true);
        this.conn.emit('data', '{"says": "yay", "uid": "999"}');
        assert(this.handleStub.calledWith(
            this.server, this.client, {"says": "yay", "uid": "999"}));
    });

    test('server handles timeout exception in handler', function() {
        this.handleStub.throws(new Error('timeout'));

        this.conn.emit('data', '{"says": "foobar", "uid": "3434"}');
        assert(this.handleStub.calledOnce, 'handler was called');
        assert(this.handleStub.threw(), 'handler threw');
        assert.deepEqual(getReply(this), {says:'error', error:'timeout', re:'3434'})

        // Server should process next message just fine
        this.handleStub.reset();
        this.handleStub.returns(true);
        this.conn.emit('data', '{"says": "yay", "uid": "999"}');
        assert(this.handleStub.calledWith(
            this.server, this.client, {"says": "yay", "uid": "999"}));
    });

    test('server handles unknown connection exception in handler', function() {
        this.handleStub.throws(new Error('unknownConnection'));

        this.conn.emit('data', '{"says": "foobar", "uid": "2056"}');
        assert(this.handleStub.calledOnce, 'handler was called');
        assert(this.handleStub.threw(), 'handler threw');
        assert.deepEqual(getReply(this), {says:'error', error:'unknownConnection', re:'2056'})

        // Server should process next message just fine
        this.handleStub.reset();
        this.handleStub.returns(true);
        this.conn.emit('data', '{"says": "yay", "uid": "999"}');
        assert(this.handleStub.calledWith(
            this.server, this.client, {"says": "yay", "uid": "999"}));
    });

    test('server tolerates exception writing back', function() {
        this.conn.write.throws();
        this.handleStub.returns(false);

        this.conn.emit('data', '{"says": "hiss", "uid": "1234"}');
        assert(this.handleStub.calledOnce, 'handler was called');
        assert(this.conn.write.calledOnce, 'server attempted to write back');

        // Server should process next message just fine
        this.conn.write.reset();
        this.handleStub.returns(true);
        this.conn.emit('data', '{"says": "yay", "uid": "897"}');
        assert(this.handleStub.calledWith(
            this.server, this.client, {"says": "yay", "uid": "897"}));
    });

    test('start server', function() {
        var http = require('http');
        var createServer = http.createServer;
        var sinon = this.sinon;
        var createServerStub = sinon.stub(http, 'createServer', function() {
            var server = createServer();
            server.listen = sinon.spy();
            return server;
        });
        this.server.start(1234, '1.2.3.4');
        assert(this.server.httpServer.listen.calledOnce, 'listen was called');
        assert(this.server.httpServer.listen.calledWith(1234, '1.2.3.4'));
    });

    test('register client with cid', function() {
        var succeeded = this.server.registerClient(this.client, '656');
        assert(succeeded, 'registration succeeded');
        assert.equal(this.client.cid, '656');
        assert.deepEqual(this.server.clients['656'], this.client);
    });

    test('register client allowed once per cid', function() {
        var client1 = {conn:{}}, client2 = {conn:{}};
        var succeeded1 = this.server.registerClient(client1, '777');
        var succeeded2 = this.server.registerClient(client2, '777');
        assert(succeeded1, 'registration 1 succeeded');
        assert(!succeeded2, 'registration 2 failed');
        assert.strictEqual(this.server.clients['777'], client1);
    });

    test('registered client connection cleared when connection closes', function() {
        this.server.registerClient(this.client, '555');
        assert(this.server.clients['555'].conn);
        this.conn.emit('close');
        assert(!this.server.clients['555'].conn);
    });

    test('cid can be reused after reconnecting', function() {
        this.server.registerClient(this.client, '512');
        this.conn.emit('close');
        assert(!this.server.clients['512'].conn);
        var succeeded = this.server.registerClient('512', this.client);
        assert(succeeded, 'registration succeeded');
        assert.deepEqual(this.server.clients['512'], this.client);
    });

    test('new client cid', function() {
        this.server.registerClient(this.client);
        var cid = this.client.cid;
        assert(cid, 'cid not empty');
        assert.strictEqual(this.server.clients[cid], this.client);
    });

    test('new client idempotent', function() {
        this.server.registerClient(this.client);
        var cid = this.client.cid;
        assert(cid, 'cid not empty');
        this.server.registerClient(this.client)
        assert.equal(this.client.cid, cid);
        assert.strictEqual(this.server.clients[cid], this.client);
    });

    test('require registered with registered client', function() {
        var cid = this.server.registerClient(this.client);
        this.server.requireRegisteredClient(this.client)
    });

    test('require registered with unknown client', function() {
        var server = this.server
          , client = this.client;
        assert.throws(function() {
            server.requireRegisteredClient(client);
        }, /unknownConnection/);
    });

    test('loads game from db on demand', function(done) {
        var game = require('../lib/game')
          , server = this.server
          , client = this.client
          , testGame = {uid:"349808"};
        this.sinon.stub(game, 'load', function(db, uid, cb) {
            assert.strictEqual(db, server.db);
            assert.equal(uid, testGame.uid);
            cb(null, testGame);
        });
        server.game(testGame.uid, function(err, game) {
            assert(!err, err);
            assert.strictEqual(game, testGame);
            assert.strictEqual(server.games[testGame.uid], testGame);
            done();
        });
    });

    test('loads game from cache when possible', function(done) {
        var game = require('../lib/game')
          , testGame = {uid:"3459083405"}
          , loadStub = this.sinon.stub(game, 'load');
        this.server.addGame(testGame);
        this.server.game(testGame.uid, function(err, game) {
            assert(!err, err);
            assert.strictEqual(game, testGame);
            assert(!loadStub.called);
            done();
        });
    });

    test('loads game for client id', function(done) {
        var game = require('../lib/game')
          , testGame = {uid:"345987345", nations:{}}
          , testNation = {uid:"342598061"}
          , loadStub = this.sinon.stub(game, 'load')
          , cid = "2398234980";
        testGame.nations[testNation.uid] = testNation;
        this.server.addGame(testGame);
        this.dbMock.expects('get')
            .withArgs(key('player','client', cid))
            .yields(null, {game:testGame.uid, nation:testNation.uid});
        this.server.gameForClientId(cid, function(err, theGame) {
            assert(!err, err);
            assert.strictEqual(theGame, testGame);
            done();
        });
    });

    test('game for client id unknown cid', function(done) {
        var cid = "345093845"
          , notFoundErr = {notFound: true};
        this.dbMock.expects('get')
            .withArgs(key('player','client', cid))
            .yields(notFoundErr);
        this.server.gameForClientId(cid, function(err, theGame) {
            assert(!err);
            assert(!theGame);
            done();
        });
    });

    test('game for client id error loading player info', function(done) {
        var cid = "23458754"
          , dbErr = 'error';
        this.dbMock.expects('get')
            .withArgs(key('player','client', cid))
            .yields(dbErr);
        this.server.gameForClientId(cid, function(err, theGame) {
            assert.strictEqual(err, dbErr);
            assert(!theGame);
            done();
        });
    });

    test('game for client id error loading game', function(done) {
        var cid = "23458754"
          , dbErr = 'error';
        this.dbMock.expects('get')
            .withArgs(key('player','client', cid))
            .yields(null, {game:"2309865", nation:"4510682"});
        this.server.game = function(uid, cb) {cb(dbErr)};

        this.server.gameForClientId(cid, function(err, theGame) {
            assert.strictEqual(err, dbErr);
            assert(!theGame);
            done();
        });
    });

    test('game for client id no matching nation', function(done) {
        var game = require('../lib/game')
          , testGame = {uid:"4350601", nations:{}}
          , loadStub = this.sinon.stub(game, 'load')
          , cid = "345096012";
        this.server.addGame(testGame);
        this.dbMock.expects('get')
            .withArgs(key('player','client', cid))
            .yields(null, {game:testGame.uid, nation:"435980651"});
        this.server.gameForClientId(cid, function(err, theGame) {
            assert(err);
            assert(!theGame);
            assert(err.toString().indexOf('Nation') != -1, err);
            assert(err.toString().indexOf('not found') != -1, err);
            done();
        });
    });

});

suite('server client', function() {
    var server = require('../lib/server');

    this.beforeEach(function() {
        this.conn = new MockConn;
        this.client = new server.Client(this.conn);
    });

    function getReply(test) {
        assert(test.conn.write.called, 'expected server to reply');
        return JSON.parse(test.conn.write.lastCall.args[0]);
    }

    test('construction', function() {
        assert.strictEqual(this.client.conn, this.conn);
        assert(!this.client.cid);
    });

    test('send', function() {
        this.client.send({says:'wat'});
        assert.deepEqual(getReply(this), {says:'wat'});
    });

    test('sendError with msg', function() {
        this.client.sendError('testError', {says:'wat', uid:'543'});
        assert.deepEqual(getReply(this), {says:'error', error:'testError', re:'543'});
    });

    test('sendError without msg', function() {
        this.client.sendError('testYetAgain');
        assert.deepEqual(getReply(this), {says:'error', error:'testYetAgain'});
    });

    test('closed clears conn', function() {
        assert(this.client.conn);
        this.client.closed();
        assert(!this.client.conn);
    });

    test('join game', function() {
        var testGame = new MockGame("56234098")
          , testNation = {uid:"6309638", people:[1,2,3]};
        this.client.cid = "3459806239";
        var dbMock = sinon.mock(testGame.db);
        dbMock.expects('put').withArgs(
            key('player', 'client', this.client.cid)
          , {game: testGame.uid, nation: testNation.uid});
        var clientMock = sinon.mock(this.client);
        clientMock.expects('sendUpdate').withArgs(testNation.people);

        this.client.joinGame(testGame, testNation);
        assert.strictEqual(this.client.game, testGame);
        assert.strictEqual(this.client.nation, testNation);
        dbMock.verify();
        clientMock.verify();
    });

    test('after join game listens for object changes', function() {
        var testGame = new MockGame("3450986")
          , testNation = {uid:"3240965", people:[1,2,3]};
        this.client.cid = "1956470";
        var clientMock = sinon.mock(this.client);
        clientMock.expects('sendUpdate').once();

        this.client.joinGame(testGame, testNation);

        var objs = [
            {uid:"2347869", nationUid:testNation.uid}
          , {uid:"4360495", nationUid:testNation.uid}
          , {uid:"1691239", nationUid:"345983045"}
        ];
        testGame.emit('objectChanged', objs[0]);
        testGame.emit('objectChanged', objs[1]);
        testGame.emit('objectChanged', objs[2]);
        clientMock.verify();
        assert.strictEqual(this.client.updates[objs[0].uid], objs[0]);
        assert.strictEqual(this.client.updates[objs[1].uid], objs[1]);
    });

    test('after object changes sends an update', function() {
        var testGame = {info: 'INFO', objects:{}}
          , testNation = {uid: "45601298"}
          , clock = sinon.useFakeTimers();
        this.client.game = testGame;
        this.client.nation = testNation;

        var objs = [
            {uid:"4235096", type:'person', nationUid:testNation.uid}
          , {uid:"0923487", type:'person', nationUid:testNation.uid}
          , {uid:"8965892", type:'person', nationUid:"345983045"}
        ];
        objs.forEach(function(obj) {testGame.objects[obj.uid] = obj});
        assert(!this.client.updateTask);
        this.client.objectChanged(objs[0]);
        var task = this.client.updateTask;
        assert(task);
        this.client.objectChanged(objs[1]);
        assert.equal(this.client.updateTask, task);
        this.client.objectChanged(objs[2]);
        assert.equal(this.client.updateTask, task);
        this.client.objectChanged(objs[0]);

        assert(!this.conn.write.called);
        clock.tick(this.client.UPDATE_TIMEOUT + 1);
        var msg = getReply(this);
        assert.equal(msg.says, 'update');
        assert.equal(msg.game, testGame.info);
        assert.equal(msg.objects.length, 2);
        assert.deepEqual(this.client.updates, {});
        assert(!this.client.updateTask);
        assert(msg.objects[0].uid == objs[0].uid);

        clock.restore();
    });

});

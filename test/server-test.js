var assert = require('assert');
var util = require('util');
var events = require('events');
var sinon = require('sinon');

suite('server', function() {
    var Server = require('../lib/server.js').Server;
    var handler = require('../lib/serverhandler');

    var MockConn = function() {
        this.remoteAddress = '1.2.3.4',
        this.remotePort = 5557,
        this.write = sinon.stub();
    }
    util.inherits(MockConn, events.EventEmitter);

    this.beforeEach(function() {
        this.sinon = sinon.sandbox.create();
        this.testServer = new Server;
        this.testConn = new MockConn;
        this.testServer.sockjsServer.emit('connection', this.testConn);
        this.handleStub = this.sinon.stub(handler, 'handle');
    });

    this.afterEach(function(){
        this.sinon.restore();
    });

    function getReply(test) {
        return JSON.parse(test.testConn.write.lastCall.args[0]);
    }

    test('parse message and call handler', function() {
        this.handleStub.returns(true);

        this.testConn.emit('data', '{"says": "foobar", "uid": "1234"}');

        assert(this.handleStub.calledOnce, 'handler was called');
        assert(this.handleStub.calledWith(
            this.testServer, this.testConn, {"says": "foobar", "uid": "1234"}));
        assert(!this.testConn.write.called, 'Server should not write back');
    });

    test('unparsable message', function() {
        this.testConn.emit('data', '{This is not pudding');

        assert(!this.handleStub.called, 'handler should not be called');
        assert(this.testConn.write.calledOnce, 'server should write back');
        var reply = getReply(this);
        assert.equal(reply.says, 'error', 'write back should be an error');
        assert.equal(reply.error, 'badMessage');
    });

    test('unhandled message', function() {
        this.handleStub.returns(false);

        this.testConn.emit('data', '{"says": "boo", "uid": "1234"}');
        assert(this.handleStub.calledOnce, 'handler was called');
        var reply = getReply(this);
        assert.equal(reply.says, 'error', 'write back should be an error');
        assert.equal(reply.error, 'unhandledMessage');
        assert.equal(reply.re, '1234', 'write back should reference orig msg');
    });

    test('message missing "says"', function() {
        this.testConn.emit('data', '{"uid": "1111"}');
        assert(!this.handleStub.called, 'handler not called');
        var reply = getReply(this);
        assert.equal(reply.says, 'error', 'write back should be an error');
        assert.equal(reply.error, 'incompleteMessage');
        assert.equal(reply.re, '1111', 'write back should reference orig msg');
    });

    test('message missing "uid"', function() {
        this.testConn.emit('data', '{"says": "buhbye"}');
        assert(!this.handleStub.called, 'handler not called');
        var reply = getReply(this);
        assert.equal(reply.says, 'error', 'write back should be an error');
        assert.equal(reply.error, 'incompleteMessage');
    });

    test('server tolerates exception in handler', function() {
        this.handleStub.throws();

        this.testConn.emit('data', '{"says": "foobar", "uid": "5678"}');
        assert(this.handleStub.calledOnce, 'handler was called');
        assert(this.handleStub.threw(), 'handler threw');
        var reply = getReply(this);
        assert.equal(reply.says, 'error', 'write back should be an error');
        assert.equal(reply.error, 'unexpectedError');
        assert.equal(reply.re, '5678', 'write back should reference orig msg');

        // Server should process next message just fine
        this.handleStub.reset();
        this.handleStub.returns(true);
        this.testConn.emit('data', '{"says": "yay", "uid": "999"}');
        assert(this.handleStub.calledWith(
            this.testServer, this.testConn, {"says": "yay", "uid": "999"}));
    });

    test('server tolerates exception writing back', function() {
        this.testConn.write.throws();
        this.handleStub.returns(false);

        this.testConn.emit('data', '{"says": "hiss", "uid": "1234"}');
        assert(this.handleStub.calledOnce, 'handler was called');
        assert(this.testConn.write.calledOnce, 'server attempted to write back');

        // Server should process next message just fine
        this.testConn.write.reset();
        this.handleStub.returns(true);
        this.testConn.emit('data', '{"says": "yay", "uid": "897"}');
        assert(this.handleStub.calledWith(
            this.testServer, this.testConn, {"says": "yay", "uid": "897"}));
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
        this.testServer.start(1234, '1.2.3.4');
        assert(this.testServer.httpServer.listen.calledOnce, 'listen was called');
        assert(this.testServer.httpServer.listen.calledWith(1234, '1.2.3.4'));
    });

    test('register client', function() {
        var succeeded = this.testServer.registerClient('656', this.testConn);
        assert(succeeded, 'registration succeeded');
        assert.deepEqual(this.testServer.clientConns['656'], this.testConn);
    });

    test('register client allowed once per cid', function() {
        var conn1 = 'foo', conn2 = 'bar';
        var succeeded1 = this.testServer.registerClient('777', conn1);
        var succeeded2 = this.testServer.registerClient('777', conn2);
        assert(succeeded1, 'registration 1 succeeded');
        assert(!succeeded2, 'registration 2 failed');
        assert.deepEqual(this.testServer.clientConns['777'], conn1);
    });

    test('registered client removed when connection closes', function() {
        this.testServer.registerClient('555', this.testConn);
        assert.deepEqual(this.testServer.clientConns['555'], this.testConn);
        this.testConn.emit('close');
        assert.equal(this.testServer.clientConns['555'], undefined);
    });

    test('cid can be reused after reconnecting', function() {
        this.testServer.registerClient('512', this.testConn);
        this.testConn.emit('close');
        assert.equal(this.testServer.clientConns['512'], undefined);
        var succeeded = this.testServer.registerClient('512', this.testConn);
        assert(succeeded, 'registration succeeded');
        assert.deepEqual(this.testServer.clientConns['512'], this.testConn);
    });

    test('new client cid', function() {
        var cid = this.testServer.newClient(this.testConn);
        assert(cid, 'cid not empty');
        assert.deepEqual(this.testServer.clientConns[cid], this.testConn);
    });

     test('new client idempotent', function() {
        var cid = this.testServer.newClient(this.testConn);
        assert(cid, 'cid not empty');
        assert.equal(cid, this.testServer.newClient(this.testConn), 'returned same cid');
        assert.deepEqual(this.testServer.clientConns[cid], this.testConn);
    });

});


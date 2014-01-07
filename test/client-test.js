var assert = require('chai').assert
  , sinon = require('sinon')
  , events = require('events');

suite('client', function() {
    var client = require('../lib/client')
      , sockjs = require('sockjs-client');

    this.beforeEach(function() {
        this.sinon = sinon.sandbox.create();
        this.sockjsMock = this.sinon.mock(sockjs);
        this.testSockJs = new events.EventEmitter();
        this.testSockJs.write = this.sinon.stub();
        this.sockjsCreate = this.sockjsMock.expects('create')
            .withArgs('http://ismhost:5557/ism').returns(this.testSockJs);
        this.client = client.create(5557, 'ismhost');
        this.client.connected = true;
        this.replyWith = function(msg) {
            this.testSockJs.emit('data', JSON.stringify(msg));
        }
        this.getSent = function() {
            assert(this.testSockJs.write.called, 'nothing was sent');
            return JSON.parse(this.testSockJs.write.lastCall.args[0])
        }
    });

    this.afterEach(function() {
        this.sockjsMock.verify();
        this.sinon.restore();
    });


    test('create', function() {
        assert.instanceOf(this.client, client.Client);
    });

    test('connects', function() {
        this.client.connected = false;
        this.testSockJs.emit('connection');
        assert(this.client.connected);
    });

    test('emits connection event', function(done) {
        var client = this.client;
        this.client.on('connection', function() {
            assert.strictEqual(this, client);
            done();
        });
        this.testSockJs.emit('connection');
    });

    test('disconnects', function() {
        assert(this.client.connected);
        this.testSockJs.emit('close');
        assert(!this.client.connected);
    });

    test('emits disconnected event', function(done) {
        var client = this.client;
        this.client.on('close', function() {
            assert.strictEqual(this, client);
            done();
        });
        this.testSockJs.emit('close');
    });

    test('emits error event on socket error with description', function(done) {
        var testError = [{code:'ETIMEDOUT'}];
        var client = this.client;
        this.client.on('error', function(errorMsg, errno, err) {
            assert.strictEqual(this, client);
            assert.equal(errorMsg, 'websocketError');
            assert.equal(errno.description, require('errno').code.ETIMEDOUT.description);
            assert.strictEqual(err, testError);
            done();
        });
        this.testSockJs.emit('error', testError);
    });

    test('emits error event on data parse error', function(done) {
        var client = this.client;
        this.client.on('error', function(errorMsg) {
            assert.strictEqual(this, client);
            assert.equal(errorMsg, 'parseError');
            done();
        });
        this.testSockJs.emit('data', "{'says':'goo");
    });

    test('emits serverError event on server error', function(done) {
        var client = this.client
          , msg = {says:"error", error:"someServerError"};
        this.client.on('serverError', function(errorMsg) {
            assert.strictEqual(this, client);
            assert.deepEqual(errorMsg, msg);
            done();
        });
        this.replyWith(msg);
    });

    test('emits msg: event', function(done) {
        var client = this.client;
        var testMsg = {says:'test', param:'foobar'};
        this.client.on('msg:test', function(msg) {
            assert.strictEqual(this, client);
            assert.deepEqual(msg, testMsg);
            done();
        });
        this.replyWith(testMsg);
    });

    test('emits msg:unknown event for incomplete msg', function(done) {
        var client = this.client;
        var testMsg = {param:'yayaya'};
        this.client.on('msg:unknown', function(msg) {
            assert.strictEqual(this, client);
            assert.deepEqual(msg, testMsg);
            done();
        });
        this.replyWith(testMsg);
    });

    test('emits msg:unknown event for incomplete msg', function(done) {
        var client = this.client;
        var testMsg = {param:'yayaya'};
        this.client.on('msg:unknown', function(msg) {
            assert.strictEqual(this, client);
            assert.deepEqual(msg, testMsg);
            done();
        });
        this.replyWith(testMsg);
    });

    test('close closes socket', function() {
        this.testSockJs.close = sinon.spy();
        this.client.close();
        assert(this.testSockJs.close.calledOnce);
    });

    test('send writes JSON to socket', function() {
        var msg = {says:'hey', params:'yeah'};
        this.client.send(msg);
        assert(this.testSockJs.write.calledWith(JSON.stringify(msg)));
    });

    test('send with string', function() {
        var uid = this.client.send('itsme');
        var sent = this.getSent();
        assert.equal(sent.says, 'itsme');
        assert.equal(sent.uid, uid);
    });

    test('send adds client cid and uid', function() {
        var msg = {says:'hey', params:'yeah'};
        this.client.cid = '12345';
        var uid = this.client.send(msg);
        var sent = this.getSent();
        assert.equal(sent.uid, uid);
        assert.equal(sent.cid, this.client.cid);
    });

    test('write error emits error event', function(done) {
        var client = this.client;
        this.testSockJs.write.throws('testError');
        this.client.on('error', function(errorMsg, err) {
            assert.strictEqual(this, client);
            assert.equal(errorMsg, 'serverWriteError');
            assert.equal(err, 'testError');
            done();
        });
        this.client.send('well');
    });

    test('reply calls reply handler', function() {
        var replyHandler = sinon.stub().returns(true)
          , msgHandler = sinon.spy()
          , serverMsg = {says:'yo'};
        this.client.on('msg:whoa', msgHandler);
        var uid = this.client.send('yo', replyHandler);
        serverMsg.re = uid;
        assert(!replyHandler.called);
        this.replyWith(serverMsg);
        assert(!msgHandler.called);
        assert(replyHandler.calledWith(serverMsg), replyHandler.lastCall);
        assert(replyHandler.calledOn(this.client), replyHandler.lastCall);
    });

    test('reply calls reply handler only once if handled', function() {
        var replyHandler = sinon.stub().returns(true)
          , serverMsg = {says:'yo'};
        var uid = this.client.send('yo', replyHandler);
        serverMsg.re = uid;
        assert(!replyHandler.called);
        this.replyWith(serverMsg);
        this.replyWith(serverMsg);
        assert(replyHandler.calledOnce, replyHandler.lastCall);
    });

    test('reply does not call reply handler for non-matching reply', function() {
        var replyHandler = sinon.stub().returns(true)
          , serverMsg = {says:'whoa'};
        var uid = this.client.send('yo', replyHandler);
        serverMsg.re = uid;
        this.replyWith(serverMsg);
        assert(!replyHandler.called);
    });

    test('reply handler not cleared if it returns false', function() {
        var replyHandler = sinon.stub().returns(false)
          , clientMsg = {says:'yo'}
          , serverMsg = {says:'yo'};
        var uid = this.client.send(clientMsg, replyHandler);
        serverMsg.re = uid;
        assert(!replyHandler.called);
        this.replyWith(serverMsg);
        this.replyWith(serverMsg);
        assert(replyHandler.calledTwice, replyHandler.callCount);
    });

    test('handshake sets cid', function(done) {
        var test = this;
        assert(!this.client.cid);

        this.client.handshake(function() {
            assert.strictEqual(this, test.client);
            assert.equal(this.cid, '3498579834');
            done();
        });

        var sent = this.getSent();
        assert.equal(sent.says, 'hi');
        assert(!sent.cid);
        this.replyWith({says:'hi', cid:'3498579834', re:sent.uid});
    });

    test('handshake sends version', function() {
        var version = require('../package.json').version;

        this.client.handshake();
        var sent = this.getSent();
        assert.equal(sent.says, 'hi');
        assert.equal(sent.clientVersion, version);
    });

});

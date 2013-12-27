var assert = require('chai').assert
  , sinon = require('sinon')
  , events = require('events')
  , util = require('util');

suite('client', function() {
    var client = require('../client/client')
      , sockjs = require('sockjs-client');

    this.beforeEach(function() {
        this.sinon = sinon.sandbox.create();
        this.sockjsMock = this.sinon.mock(sockjs);
        this.testSockJs = new events.EventEmitter;
        this.testSockJs.write = this.sinon.stub();
        this.sockjsCreate = this.sockjsMock.expects('create')
            .withArgs('http://ismhost:5557/ism').returns(this.testSockJs);
        this.client = client.create(5557, 'ismhost');
        this.client.connected = true;
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

    test('emits connected event', function(done) {
        var client = this.client;
        this.client.on('connected', function() {
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

    test('emits error event on socket error', function(done) {
        var client = this.client;
        this.client.on('error', function(errorMsg, error) {
            assert.strictEqual(this, client);
            assert.equal(errorMsg, 'websocketError');
            assert.equal(error, 'testError');
            done();
        });
        this.testSockJs.emit('error', 'testError');
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

    test('emits error event on server error', function(done) {
        var client = this.client;
        this.client.on('error', function(errorMsg) {
            assert.strictEqual(this, client);
            assert.equal(errorMsg, 'someServerError');
            done();
        });
        this.testSockJs.emit('data', '{"says":"error", "error":"someServerError"}');
    });

    test('emits msg: event', function(done) {
        var client = this.client;
        var testMsg = {says:'test', param:'foobar'};
        this.client.on('msg:test', function(msg) {
            assert.strictEqual(this, client);
            assert.deepEqual(msg, testMsg);
            done();
        });
        this.testSockJs.emit('data', JSON.stringify(testMsg));
    });

    test('emits msg:unknown event for incomplete msg', function(done) {
        var client = this.client;
        var testMsg = {param:'yayaya'};
        this.client.on('msg:unknown', function(msg) {
            assert.strictEqual(this, client);
            assert.deepEqual(msg, testMsg);
            done();
        });
        this.testSockJs.emit('data', JSON.stringify(testMsg));
    });

    test('emits msg:unknown event for incomplete msg', function(done) {
        var client = this.client;
        var testMsg = {param:'yayaya'};
        this.client.on('msg:unknown', function(msg) {
            assert.strictEqual(this, client);
            assert.deepEqual(msg, testMsg);
            done();
        });
        this.testSockJs.emit('data', JSON.stringify(testMsg));
    });

    test('send writes JSON to socket', function() {
        var msg = {says:'hey', params:'yeah'};
        this.client.send(msg);
        assert(this.testSockJs.write.calledWith(JSON.stringify(msg)));
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
        this.client.send({});
    });

    test('reply calls reply handler', function() {
        var replyHandler = sinon.stub()
          , msgHandler = sinon.spy()
          , clientMsg = {says:'yo'}
          , serverMsg = {says:'whoa'};
        replyHandler.returns(true);
        this.client.on('msg:whoa', msgHandler);
        var uid = this.client.send(clientMsg, replyHandler);
        serverMsg.re = uid;
        assert(!replyHandler.called);
        this.testSockJs.emit('data', JSON.stringify(serverMsg));
        assert(!msgHandler.called);
        assert(replyHandler.calledWith(this.client, serverMsg));
    });

    test('reply calls reply handler only once if handled', function() {
        var replyHandler = sinon.stub()
          , clientMsg = {says:'yo'}
          , serverMsg = {says:'whoa'};
        replyHandler.returns(true);
        var uid = this.client.send(clientMsg, replyHandler);
        serverMsg.re = uid;
        assert(!replyHandler.called);
        this.testSockJs.emit('data', JSON.stringify(serverMsg));
        this.testSockJs.emit('data', JSON.stringify(serverMsg));
        assert(replyHandler.calledOnce);
    });

    test('reply handler not cleared if it returns false', function() {
        var replyHandler = sinon.stub()
          , clientMsg = {says:'yo'}
          , serverMsg = {says:'whoa'};
        replyHandler.returns(false);
        var uid = this.client.send(clientMsg, replyHandler);
        serverMsg.re = uid;
        assert(!replyHandler.called);
        this.testSockJs.emit('data', JSON.stringify(serverMsg));
        this.testSockJs.emit('data', JSON.stringify(serverMsg));
        assert(replyHandler.calledTwice);
    });

});

var assert = require('assert');
var sinon = require('sinon');
var Server = require('../lib/server').Server;

var MockConn = function() {
    this.remoteAddress = '1.2.3.4',
    this.remotePort = 5557,
    this.close = sinon.stub();
}

var before = function() {
    this.sinon = sinon.sandbox.create();
    this.server = new Server;
    this.serverMock = this.sinon.mock(this.server);
    this.conn = new MockConn;
}
var after = function() {
    this.serverMock.verify();
    this.sinon.restore();
}

suite('general handler', function() {
    var handle = require('../lib/serverhandler').handle;

    this.beforeEach(before);
    this.afterEach(after);

    test('unhandled msg returns false', function() {
        this.serverMock.expects('send').never();
        var handled = handle(this.server, this.conn, {says:'whyioughtta', uid:'123'});
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
        this.serverMock.expects('newClient').once().withArgs(this.conn).returns('321');
        this.serverMock.expects('sendError').never();
        this.serverMock.expects('send').once()
            .withArgs(this.conn, {says:'hi', cid:'321', re:'012'});

        var handled = handle(this.server, this.conn, 
            {says:'hi', clientVersion:version, uid:'012'});
        assert(handled);
        assert(!this.conn.close.called, 'Connection should not be closed');
    });

    test('sends error with mismatched client version and closes conn', function() {
        var msg = {says:'hi', clientVersion:'whateva', uid:'42'}
        this.serverMock.expects('sendError').once()
            .withArgs(this.conn, 'incompatibleClientVersion', msg);
        var handled = handle(this.server, this.conn, msg);
        assert(handled);
        assert(this.conn.close.called, 'Connection should be closed');
    });

    test('sends error when no cid issued and closes conn', function() {
        this.serverMock.expects('newClient').once().withArgs(this.conn).returns(undefined);
        var msg = {says:'hi', clientVersion:version, uid:'96'}
        this.serverMock.expects('sendError').once()
            .withArgs(this.conn, 'noNewConnections', msg);
        var handled = handle(this.server, this.conn, msg);
        assert(handled);
        assert(this.conn.close.called, 'Connection should be closed');
    });

    test('successful with reconnecting client', function() {
        this.serverMock.expects('registerClient').once().withArgs('888', this.conn).returns(true);
        this.serverMock.expects('sendError').never();
        this.serverMock.expects('send').once()
            .withArgs(this.conn, {says:'ok', re:'357'});

        var handled = handle(this.server, this.conn, 
            {says:'hi', clientVersion:version, cid:'888', uid:'357'});
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
        this.serverMock.expects('sendError').never();
        this.serverMock.expects('send').once()
            .withArgs(this.conn, {says:'games', re:'451', list:games});

        var handled = handle(this.server, this.conn, {says:'games', uid:'451'});
        assert(handled);
    });

    test('reports error', function() {
        this.sinon.stub(game, 'list', function(db, cb) {
            cb(new Error('Yipes!'));
        });
        var msg = {says:'games', uid:'890'}
        this.serverMock.expects('sendError').once()
            .withArgs(this.conn, 'unexpectedError', msg);
        var handled = handle(this.server, this.conn, msg);
        assert(handled);
    });

});

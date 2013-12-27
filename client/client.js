var events = require('events')
  , util = require('util')
  , sockjs = require('sockjs-client')
  , log = require('../lib/logging').log
  , genUid = require('../lib/uid').genUid;

function Client(port, host, cid) {
    events.EventEmitter.call(this);

    var client = this;
    this.cid = cid;
    this.replyHandlers = {};

    this.url = 'http://' + host + ':' + port + '/ism';
    log.info('Connecting to server ' + host + ':' + port);
    var sock = sockjs.create(this.url);

    sock.on('connection', function() {
        client.connected = true;
        log.info('Connected.');
        client.emit('connected');
    });

    sock.on('error', function(err) {
        log.error('Websocket error', err);
        client.emit('error', 'websocketError', err);
    });

    sock.on('close', function() {
        log.info('Connection to server closed.');
        client.connected = false;
        client.emit('close');
    });

    sock.on('data', function(msgStr) {
        log.debug('Received message', msgStr);
        try {
            var msg = JSON.parse(msgStr);
        } catch (err) {
            log.error('Error parsing message from server', err);
            client.emit('error', 'parseError');
            return;
        }
        if (msg.says == 'error') {
            log.info('Server replied with error', msg.error);
            if (msg.re) delete client.replyHandlers[msg.re];
            client.emit('error', msg.error);
            return;
        }
        if (msg.says && msg.re) {
            var handler = client.replyHandlers[[msg.says, msg.re]];
            if (handler) {
                var handled = handler.call(client, msg);
                if (handled !== false) {
                    delete client.replyHandlers[[msg.says, msg.re]];
                    return;
                }
            }
        }
        client.emit('msg:' + (msg.says || 'unknown'), msg);
    });

    this.send = function send(msg, replyHandler) {
        if (!this.connected) {
            log.info('Cannot send message, connection closed');
            return;
        }
        if (typeof msg == 'string') {
            msg = {says: msg};
        }
        msg.uid = genUid();
        if (this.cid) msg.cid = this.cid;
        try {
            var data = JSON.stringify(msg);
            sock.write(data);
        } catch (err) {
            log.error('Error writing to server', err);
            client.emit('error', 'serverWriteError', err);
            return;
        }
        log.debug('Sent message', data);
        if (typeof replyHandler == 'function') {
            this.replyHandlers[[msg.says, msg.uid]] = replyHandler;
        }
        return msg.uid;
    }

    this.handshake = function handshake(cb) {
        this.send('hi', function(reply) {
            this.cid = reply.cid;
            cb.call(this);
        });
    }

}
util.inherits(Client, events.EventEmitter);
exports.Client = Client;

exports.create = function(port, host) {
    return new Client(port, host);
}



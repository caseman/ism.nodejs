var events = require('events')
  , util = require('util')
  , sockjs = require('sockjs-client')
  , fs = require('fs')
  , path = require('path')
  , extend = require('extend')
  , log = require('./logging').log
  , clientVersion = require('../package.json').version
  , genUid = require('./uid').genUid;

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
        client.emit('connection');
    });

    sock.on('error', function(err) {
        var code = err[0] && err[0].code ? err[0].code : 'UNKNOWN'
          , errno = require('errno').code[code];
        log.error('Websocket error', errno || err);
        client.emit('error', 'websocketError', errno, err);
    });

    sock.on('close', function() {
        log.info('Connection to server closed.');
        client.connected = false;
        client.emit('close');
    });

    sock.on('data', function(msgStr) {
        var msg;
        log.debug('Received message', msgStr);
        try {
            msg = JSON.parse(msgStr);
        } catch (err) {
            log.error('Error parsing message from server', err);
            client.emit('error', 'parseError');
            return;
        }
        if (msg.says == 'error') {
            log.info('Server replied with error', msg.error);
            if (msg.re) delete client.replyHandlers[msg.re];
            client.emit('serverError', msg);
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
        client.emit('msg ' + (msg.says || 'unknown'), msg);
    });

    this.close = function() {
        sock.close();
    }

    this.send = function send(msg, replyHandler) {
        var data;
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
            data = JSON.stringify(msg);
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
        this.send({says:'hi', clientVersion:clientVersion}, function(reply) {
            this.cid = reply.cid;
            cb.call(this);
        });
    }

    this.createGame = function createGame(configNames, cb, progressCb) {
        configNames.unshift('default');
        var configs = configNames.map(function(name) {
            return require('../map-config/' + name + '.json');
        });
        configs.unshift({});
        var createMsg = {says:'createGame', mapParams:extend.apply(null, configs)};

        var progress;
        if (progressCb) {
            progress = function(msg) {
                if (msg.re == createMsg.uid) progressCb(msg.progress);
            }
            this.on('msg working', progress);
        }
        this.send(createMsg, function(reply) {
            if (progressCb) this.removeListener('msg working', progress);
            cb(reply.game);
        });
    }

    this.on('msg update', function(msg) {
        var game = this.gameState;
        if (msg.game && (!game || game.info.uid != msg.game.uid)) {
            this.gameState = new GameState(msg);
            client.emit('joinGame', client.gameState);
        } else {
            if (msg.game) {
                var oldInfo = game.info;
                game.info = msg.game;
                client.emit('updateGame', oldInfo, msg.game, game);
            }
            if (msg.nation) {
                var oldNation = game.nation;
                game.nation = extend({}, game.nation, msg.nation);
                client.emit('updateNation', oldNation, msg.nation, game);
            }
            if (msg.people) {
                for (var uid in msg.people) {
                    var person = msg.people[uid];
                    game.people[uid] = person;
                    for (var tileKey in person.tilesSeen) {
                        game.nation.tilesSeen[tileKey] = person.tilesSeen[tileKey];
                    }
                }
                client.emit('updatePeople', msg.people, game);
            }
        }
    });

}
util.inherits(Client, events.EventEmitter);
exports.Client = Client;

exports.create = function(port, host, cid) {
    return new Client(port, host, cid);
}

function GameState(info) {
    this.info = info.game;
    this.nation = info.nation;
    this.people = info.people;

    this.tile = function(x, y) {
        var tileKey = x + ',' + y
          , tile = this.nation.tilesSeen[tileKey];
        if (tile) {
            for (var i = 0; i < this.nation.people.length; i++) {
                var uid = this.nation.people[i]
                  , person = this.people[uid]
                  , tileSeen = person && person.tilesSeen[tileKey];
                if (tileSeen) {
                    tileSeen.inView = true;
                    return tileSeen;
                }
            }
            tile.inView = false;
            return tile;
        }
    }
}
exports.GameState = GameState;




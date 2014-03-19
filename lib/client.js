var events = require('events')
  , util = require('util')
  , sockjs = require('sockjs-client')
  , extend = require('extend')
  , log = require('./logging').log
  , clientVersion = require('../package.json').version
  , genUid = require('./uid').genUid;

function Client(serverInfo) {
    events.EventEmitter.call(this);

    var client = this
      , host = this.serverHost = serverInfo.host
      , port = this.serverPort = serverInfo.port
    this.cid = serverInfo.cid;
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
            cb(null, this.cid);
        });
    }

    this.listGames = function(cb) {
        this.send('games', function(msg) {
            cb(null, msg.list);
        })
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
            cb(null, reply.game);
        });
    }

    this.joinGame = function joinGame(gameUid) {
        this.send({says:'join', game:gameUid});
    }

    this.startGame = function startGame(gameUid) {
        this.send({says:'startGame', game:gameUid});
    }

    this.moveUnit = function moveUnit(uid, dx, dy) {
        if (this.waiting) return;
        var unit = this.gameState.units[uid]
          , toLocation = [unit.location[0] + dx, unit.location[1] + dy];
        this.send({says:'moveUnit', unit:uid, from:unit.location, to:toLocation});
    }

    this.endTurn = function endTurn() {
        if (!this.waiting) this.send('endTurn');
    }

    this.on('msg update', function(msg) {
        var game = client.gameState;
        if (msg.game && (!game || game.info.uid != msg.game.uid)) {
            client.gameState = new GameState(msg);
            client.emit('joinGame', client.gameState);
            client.emit('updateGame', msg.game, {}, client.gameState);
            client.emit('updateNation', msg.nation, {}, client.gameState);
        } else {
            if (msg.game) {
                var oldInfo = game.info;
                game.info = msg.game;
                if (oldInfo && oldInfo.turnNumber < game.info.turnNumber) {
                    client.waiting = false;
                    client.emit('turnBegins');
                }
                client.emit('updateGame', msg.game, oldInfo, game);
            }
            if (msg.nation) {
                var oldNation = game.nation;
                extend(game.nation, msg.nation);
                if (!client.waiting && game.info
                    && game.info.turnNumber === game.nation.player.turnCompleted) {
                    client.waiting = true;
                    client.emit('waitForNextTurn')
                }
                client.emit('updateNation', game.nation, oldNation, game);
            }
            if (msg.units) {
                for (var uid in msg.units) {
                    var unit = msg.units[uid];
                    game.units[uid] = unit;
                    for (var tileKey in unit.tilesSeen) {
                        game.nation.tilesSeen[tileKey] = unit.tilesSeen[tileKey];
                    }
                    client.emit('updateUnit', unit);
                }
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
    this.units = info.units;

    this.tile = function(x, y) {
        var tileKey = x + ',' + y
          , tile = this.nation.tilesSeen[tileKey];
        if (tile) {
            for (var i = 0; i < this.nation.units.length; i++) {
                var uid = this.nation.units[i]
                  , unit = this.units[uid]
                  , tileSeen = unit && unit.tilesSeen[tileKey];
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




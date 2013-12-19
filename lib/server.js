var http = require('http')
  , sockjs = require('sockjs')
  , log = require('./logging').log
  , key = require('./db').key
  , handler = require('./serverhandler')
  , genUid = require('./uid').genUid;

exports.Server = function Server(db) {
    var server = this;
    this.db = db;
    this.clients = {};
    this.games = {};

    var sockjsOptions = {
        log: function(severity, line) {
            log[severity] && log[severity](line);
        }
    };

    this.sockjsServer = sockjs.createServer(sockjsOptions);
    this.sockjsServer.on('connection', function(conn) {
        var client = exports.createClient(conn);
        log.info('Client connected ', client.addr);

        conn.on('data', function(msgStr) {
            log.debug(client.addr, 'sent', msgStr);
            try {
                var msg = JSON.parse(msgStr);
            } catch (err) {
                log.info('Unparsable message from', client.addr);
                client.sendError('badMessage');
                return;
            }
            try {
                var handled = msg.says && msg.uid && handler.handle(server, client, msg);
            } catch (err) {
                switch (err.message) {
                    case 'timeout':
                        log.info('Operation timed out for', msg, 'from', client.addr);
                        client.sendError('timeout', msg);
                        return;
                    case 'unknownConnection':
                        log.info('Operation not permitted from unknown connection from', client.addr);
                        client.sendError('unknownConnection', msg);
                        return;
                    default:
                        log.error('Unexpected error', err, 'handling message from', client.addr);
                        log.info(err.stack);
                        client.sendError('unexpectedError', msg);
                        return;
                }
            }
            if (handled) {
                log.debug('Message', msg.uid, 'from', client.addr, 'handled successfully');
            } else {
                log.info('Unhandled message from', client.addr);
                var error = (msg.says && msg.uid) ? 'unhandledMessage' : 'incompleteMessage';
                client.sendError(error, msg);
            }
        });

        conn.on('close', function() {
            client.conn = null;
            log.info('Client connection closed', client.addr);
        });
    });

    this.start = function start(port, host) {
        this.httpServer = http.createServer();
        this.sockjsServer.installHandlers(this.httpServer, {prefix: '/ism'});
        this.httpServer.listen(port, host);
        log.info('ism server listening on ' + host + ':' + port);
    }

    this.registerClient = function(client, cid) {
        var cid = cid || client.cid;
        if (cid) {
            var oldClient = this.clients[cid];
            if (!oldClient) {
                this.db.get(key('client', 'game', cid), function(err, gameUid) {
                    if (gameUid) client.inGame(gameUid);
                });
            } else {
                if (client.conn === oldClient.conn) return true;
                if (oldClient.conn) return false;
                if (oldClient.gameUid) client.inGame(oldClient.gameUid);
            }
        } else {
            cid = genUid();
        }
        client.cid = cid;
        this.clients[cid] = client;
        return true;
    }

    this.requireRegisteredClient = function(client) {
        if (!client.cid || this.clients[client.cid] !== client) {
            throw new Error('unknownConnection');
        }
    }

    this.addGame = function(game) {
        this.games[game.uid] = game;
    }

    this.game = function(uid, cb) {
        var server = this;
        if (server.games[uid]) {
            process.nextTick(function() {
                cb(null, server.games[uid]);
            });
        } else {
            var game = require('./game');
            game.load(this.db, uid, function(err, game) {
                if (!err) server.addGame(game);
                cb(err, game);
            });
        }
    }

}

function Client(conn) {
    this.conn = conn;
    this.addr = conn.remoteAddress + ':' + conn.remotePort;
    this.cid = null;
    this.game = null;

    this.send = function send(object) {
        var message = JSON.stringify(object);
        log.debug('Send to', this.addr, message);
        try {
            this.conn.write(message);
        } catch (err) {
            log.info('Write to', this.addr, 'failed due to', err);
        }
    }

    this.sendError = function sendError(error, msg) {
        log.info('error response', error, 'sent to', this.addr);
        this.send({says:'error', error:error, re:msg && msg.uid});
    }

    this.inGame = function(gameUid) {
    }
}
exports.Client = Client;

exports.createClient = function(conn) {
    return new Client(conn);
}


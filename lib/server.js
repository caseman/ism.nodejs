var http = require('http')
  , sockjs = require('sockjs')
  , path = require('path')
  , fs = require('fs')
  , child_process = require('child_process')
  , extend = require('extend')
  , log = require('./logging').log
  , key = require('./db').key
  , object = require('./object')
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
        var client = exports.createRemoteClient(conn);
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

        conn.on('close', function() {client.closed()});
    });

    this.start = function start(port, host, cb) {
        var db = this.db
          , httpServer = this.httpServer = http.createServer();
        this.sockjsServer.installHandlers(this.httpServer, {prefix: '/ism'});
        this.httpServer.listen(port, host, function() {
            var address = httpServer.address()
              , info = {
                  pid: process.pid
                , host: address.address
                , port: address.port
              }
            fs.writeFile(
                serverInfoPath(db.location)
              , JSON.stringify(info, null, 2)
              , function(err) {
                    if (err) log.error('error writing server info file', err)
                    if (cb) cb(info)
                }
            );
            log.info('ism server listening on ' + info.host + ':' + info.port);
        });
    }

    this.registerClient = function(client, cid) {
        cid = cid || client.cid;
        if (cid) {
            var oldClient = this.clients[cid];
            if (oldClient) {
                if (oldClient.conn === client.conn) return true;
                if (oldClient.conn) return false;
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

    this.requirePlayingClient = function(client) {
        this.requireRegisteredClient(client);
        if (!client.game && client.game.started()) {
            throw new Error('noActiveGame');
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
                if (err) log.error('Error loading game id', uid);
                cb(err, game);
            });
        }
    }

    this.gameForClientId = function(cid, cb) {
        var server = this;
        server.db.get(key('player', 'client', cid), function(err, player) {
            if (err && err.notFound) {
                log.info('Could not find player info for client id', cid);
                cb();
                return;
            } else if (err) {
                log.error('Error loading player info for client id', cid);
                cb(err);
                return;
            }
            server.game(player.game, function(err, theGame) {
                if (err) {
                    cb(err);
                } else {
                    var nation = theGame.nations[player.nation];
                    if (nation) {
                        cb(null, theGame, nation);
                    } else {
                        cb(new Error('Nation ' + player.nation + ' not found.'));
                    }
                }
            });
        });
    }

}

function RemoteClient(conn) {
    this.conn = conn;
    this.addr = conn.remoteAddress + ':' + conn.remotePort;
    this.cid = null;
    this.game = null;
    this.nation = null;
    this.nextUpdate = {};
    this.updateTask = null;
    this.updateNumber = 0;
    this.UPDATE_TIMEOUT = 100;

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

    this.sendUpdate = function(update) {
        var msg = update || this.nextUpdate;
        this.nextUpdate = {};
        this.updateTask = null;
        msg.says = 'update';
        msg.number = this.updateNumber++;
        this.send(msg);
    }

    this.scheduleUpdate = function() {
        if (!this.updateTask) {
            this.updateTask = setTimeout(
                this.sendUpdate.bind(this)
              , this.UPDATE_TIMEOUT
            );
        }
    }

    this.gameInfoChanged = function(gameInfo) {
        this.nextUpdate.game = gameInfo;
        this.scheduleUpdate();
    }
    var gameInfoChanged = this.gameInfoChanged.bind(this);

    this.turnBegins = function() {
        this.send({says:'turnBegins', turn:this.game.info.turnNumber});
    }
    var turnBegins = this.turnBegins.bind(this);

    this.personChanged = function(person) {
        if (!this.nextUpdate.people) this.nextUpdate.people = {};
        this.nextUpdate.people[person.uid] = object.clientCopy(person, this);
        this.scheduleUpdate();
    }
    var personChanged = this.personChanged.bind(this);

    this.joinGame = function(game, nation) {
        this.game = game;
        this.nation = nation;
        game.on('infoChanged', gameInfoChanged);
        game.on('turnBegins', turnBegins);
        nation.on('personChanged', personChanged);
        game.db.put(key('player', 'client', this.cid),
            {game:game.uid, nation:nation.uid}
        );
        var people = {}
          , client = this;
        nation.people.forEach(function(uid) {
            people[uid] = object.clientCopy(uid, client);
        });
        this.nextUpdate.game = game.info
        this.nextUpdate.nation = nation
        this.nextUpdate.people = people
        if (game.started()) this.scheduleUpdate();
    }

    this.closed = function() {
        this.conn = null;
        if (this.game) {
            this.game.removeListener('infoChanged', gameInfoChanged);
            this.game.removeListener('turnBegins', turnBegins);
        }
        if (this.nation) {
            this.nation.removeListener('personChanged', personChanged);
        }
        if (this.updateTask) clearTimeout(this.updateTask);
        log.info('Client connection closed', this.addr);
    }

}
exports.RemoteClient = RemoteClient;

exports.createRemoteClient = function(conn) {
    return new RemoteClient(conn);
}

function serverInfoPath(dbPath) {
    return path.join(path.dirname(dbPath), 'server-info.json');
}

/*
 * Return info for any running server using a db
 */
function info(dbPath) {
    var infoPath = serverInfoPath(dbPath)
    if (fs.existsSync(infoPath)) {
        try {
            var serverInfo = JSON.parse(fs.readFileSync(infoPath))
            if (serverInfo.pid && process.kill(serverInfo.pid, 0)) {
                return serverInfo
            }
        } catch (err) {
            // ignore parse and process.kill errors
        }
    }
}
exports.info = info

exports.useLocal = function(filePath, cb) {
    var serverInfo = info(filePath)
    if (serverInfo) {
        process.nextTick(function() {cb(null, serverInfo)})
    } else {
        var dbPath = path.join(path.dirname(filePath), 'db')
          , localServer = child_process.fork(path.join(__dirname, 'localserver'), [dbPath])
          , logging = require('./logging')
          , logDir = path.dirname(logging.config.filePath || logging.defaultClientPath())
          , logConfig = extend({logging: true}, logging.config,
                {filePath: path.join(logDir, 'local-server.log')})
        localServer.once('message', function(msg) {
            if (msg.pid) {
                log.debug('Message from local server', msg)
                log.info('Local server started, pid =', msg.pid)
                cb(null, msg)
            } else if (msg.error) {
                log.error('Error from local server:', msg.error)
                cb(msg.error)
            } else {
                log.error('Unhandled msg from local server', msg)
            }
        })
        localServer.on('exit', function(code) {
            log.info('Local server process exited with code', code)
        })
        localServer.on('error', function(err) {
            log.error('Local server error', err)
        })
        if (localServer.connected) {
            process.on('exit', function() {
                localServer.kill()
            })
            localServer.send(logConfig)
            localServer.send('start')
        } else {
            cb(new Error('Server did not start'))
        }
    }
}


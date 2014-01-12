var async = require('async')
  , log = require('./logging').log
  , game = require('./game')
  , map = require('./map')
  , serverVersion = require('../package.json').version;

var handlers = {}

exports.handle = function handle(server, client, msg) {
    var handler = handlers[msg.says];
    if (handler) {
        return handler(server, client, msg);
    } else {
        log.info("Couldn't understand message", msg.says, 'from', client.addr);
        return false;
    }
}

handlers.hi = function(server, client, msg) {
    if (msg.clientVersion != serverVersion) {
        log.info('Incompatible client version (', msg.clientVersion, ') for', client.addr);
        client.sendError('incompatibleClientVersion', msg);
        client.conn.close(403);
        return true;
    }
    var sendRegistered = function() {
        client.send({says:'hi', cid:client.cid, re:msg.uid});
    }
    var tooManyConnectionsError = function() {
        client.sendError('tooManyConnections', msg);
        client.conn.close(403);
    }

    if (!msg.cid) {
        var registered = server.registerClient(client);
        if (registered) {
            sendRegistered();
        } else {
            tooManyConnectionsError();
        }
    } else {
        var oldClient = server.clients[msg.cid];
        if (!oldClient) {
            server.gameForClientId(msg.cid, function(err, theGame, theNation) {
                if (!err) {
                    var registered = server.registerClient(client, msg.cid);
                    if (registered) {
                        sendRegistered();
                        if (theGame && theNation) client.joinGame(theGame, theNation);
                    } else {
                        tooManyConnectionsError();
                    }
                    return;
                }
                client.sendError('unexpectedError', msg);
            });
        } else {
            var registered = server.registerClient(client, msg.cid);
            if (registered) {
                sendRegistered();
            } else {
                client.sendError('cidInUse', msg);
                client.conn.close(403);
                return true;
            }
            if (oldClient.game) {
                client.joinGame(oldClient.game, oldClient.nation);
            }
        }
    }
    return true;
}

handlers.games = function(server, client, msg) {
    game.list(server.db, function(err, games) {
        if (err) {
            log.error('Unexpected error listing games', err);
            client.sendError('unexpectedError', msg);
        } else {
            client.send({says:'games', list:games, re:msg.uid});
        }
    });
    return true;
}

handlers.createGame = function(server, client, msg) {
    var mapTimeout = false
      , lastProgress = 0;

    if (msg.mapParams.width * msg.mapParams.height > 1024 * 1024 * 10) {
        client.sendError('mapTooLarge', msg);
        return true;
    }
    var timeout = setTimeout(function() {mapTimeout = true}, 5 * 60 * 1000);
    var gameMap = map.create(msg.mapParams, function(progress) {
        if (!mapTimeout) {
            var now = new Date();
            if (now - lastProgress >= 1000 || progress == 100) {
                client.send({says:'working', progress:progress, re:msg.uid});
                lastProgress = now;
            }
        } else {
            throw new Error('timeout');
        }
    });
    game.create(server.db, gameMap, msg.gameParams, function(err, newGame) {
        if (err) {
            log.error('Unexpected error creating game', err);
            client.sendError('unexpectedError', msg);
        } else {
            server.addGame(newGame);
            client.send({says:'createGame', game:newGame.info, re:msg.uid});
        }
        clearTimeout(timeout);
    });
    return true;
}

handlers.join = function(server, client, msg) {
    server.requireRegisteredClient(client);
    server.game(msg.game, function(err, game) {
        if (err) {
            log.error('Unexpected error joining game', err);
            client.sendError('unexpectedError', msg);
        } else {
            var nation = game.chooseNationForClient(client);
            if (nation) {
                client.joinGame(game, nation);
            } else {
                client.sendError('cannotJoin', msg);
            }
        }
    });
    return true;
}

handlers.startGame = function(server, client, msg) {
    server.requireRegisteredClient(client);
    server.game(msg.game, function(err, game) {
        if (err) {
            log.error('Unexpected error starting game', err);
            client.sendError('unexpectedError', msg);
        } else {
            if (!game.started()) {
                game.beginNextTurn();
            } else {
                client.sendError('gameAlreadyStarted', msg);
            }
        }
    });
    return true;
}


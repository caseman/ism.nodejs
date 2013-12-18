var log = require('./logging').log
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
    var registered = server.registerClient(client, msg.cid);
    if (registered) {
        client.send({says:'hi', cid:client.cid, re:msg.uid});
    } else {
        client.sendError('cidInUse', msg);
        client.conn.close(403);
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
            server.games[newGame.uid] = newGame;
            client.send({says:'game', game:newGame.info, re:msg.uid});
        }
        clearTimeout(timeout);
    });
    return true;
}


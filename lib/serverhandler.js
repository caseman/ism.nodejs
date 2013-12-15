var log = require('./logging').log
  , game = require('./game')
  , map = require('./map')
  , serverVersion = require('../package.json').version;

var handlers = {}

function clientAddr(conn) {
    return conn.remoteAddress + ':' + conn.remotePort;
}

exports.handle = function handle(server, conn, msg) {
    var handler = handlers[msg.says];
    if (handler) {
        return handler(server, conn, msg);
    } else {
        log.info("Couldn't understand message", msg.says, 'from', clientAddr(conn));
        return false;
    }
}

function sendOk(server, conn, msg) {
    server.send(conn, {says:'ok', re:msg.uid});
}

handlers.hi = function(server, conn, msg) {
    if (msg.clientVersion != serverVersion) {
        log.info('Incompatible client version (', msg.clientVersion, ') for', clientAddr(conn));
        server.sendError(conn, 'incompatibleClientVersion', msg);
        conn.close(403);
        return true;
    }
    if (msg.cid) {
        var registered = server.registerClient(msg.cid, conn);
        if (registered) {
            sendOk(server, conn, msg);
        } else {
            server.send(conn, {says:'cidInUse', re:msg.uid});
        }
    } else {
        var cid = server.newClient(conn);
        if (cid) {
            server.send(conn, {says:'hi', cid:cid, re:msg.uid});
        } else {
            server.sendError(conn, 'noNewConnections', msg);
            conn.close(403, 'Connection refused');
        }
    }
    return true;
}

handlers.games = function(server, conn, msg) {
    game.list(server.db, function(err, games) {
        if (err) {
            log.error('Unexpected error listing games', err);
            server.sendError(conn, 'unexpectedError', msg);
        } else {
            server.send(conn, {says:'games', list:games, re:msg.uid});
        }
    });
    return true;
}

handlers.createGame = function(server, conn, msg) {
    var mapTimeout = false
      , lastProgress = 0;

    if (msg.mapParams.width * msg.mapParams.height > 1024 * 1024 * 10) {
        server.sendError(conn, 'mapTooLarge', msg);
        return true;
    }
    var timeout = setTimeout(
        function() {mapTimeout = true; console.log('TIMEOUT')}
      , server.timeout || 5 * 60 * 1000);
    var gameMap = map.create(msg.mapParams, function(progress) {
        if (!mapTimeout) {
            var now = new Date();
            if (now - lastProgress >= 1000 || progress == 100) {
                server.send(conn, {says:'working', progress:progress, re:msg.uid});
                lastProgress = now;
            }
        } else {
            throw new Error('timeout');
        }
    });
    game.create(server.db, gameMap, msg.gameParams, function(err, newGame) {
        if (err) {
            log.error('Unexpected error creating game', err);
            server.sendError(conn, 'unexpectedError', msg);
        } else {
            server.games[newGame.uid] = newGame;
            server.send(conn, {says:'game', game:newGame.info, re:msg.uid});
        }
        clearTimeout(timeout);
    });
    return true;
}


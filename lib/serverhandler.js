var log = require('./logging').log
  , game = require('./game')
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


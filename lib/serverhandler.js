var log = require('./logging').log;
var serverVersion = require('../package.json').version;

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
        var msg = 
        server.send(conn, {error: 'Client version ' + serverVersion + ' required'});
        conn.close(403);
        return false;
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
            server.send(conn, {error: 'No new client connections'});
            conn.close(403, 'Connection refused');
        }
    }
    return true;
}


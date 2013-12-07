var http = require('http');
var sockjs = require('sockjs');
var log = require('./logging').log;
var handler = require('./serverhandler');
var genUid = require('./uid').genUid;

exports.Server = function Server() {
    var server = this;
    this.clientConns = {};
    this.games = {};

    this.filterGames = function filterGames(fn) {
        var filtered = [];
        for (var uid in this.games) {
            if (fn(this.games[uid])) filtered.push(this.games[uid]);
        }
        return filtered;
    }

    var sockjsOptions = {
        log: function(severity, line) {
            log[severity] && log[severity](line);
        }
    };

    this.send = function send(conn, object) {
        conn = conn.remoteAddress ? conn : this.clientConns[conn];
        var message = JSON.stringify(object);
        var client = conn.remoteAddress + ':' + conn.remotePort;
        log.debug('Send to', client, message);
        try {
            conn.write(message);
        } catch (err) {
            log.info('Write to', client, 'failed due to', err);
        }
    }

    this.sendError = function sendError(conn, error, msg) {
        conn = conn.remoteAddress ? conn : this.clientConns[conn];
        var client = conn.remoteAddress + ':' + conn.remotePort;
        log.info('error response', error, 'sent to', client);
        this.send(conn, {says:'error', error:error, re:msg && msg.uid});
    }

    this.sockjsServer = sockjs.createServer(sockjsOptions);
    this.sockjsServer.on('connection', function(conn) {
        var client = conn.remoteAddress + ':' + conn.remotePort;
        log.info('Client connected ', client);

        conn.on('data', function(message) {
            log.debug(client, 'sent', message);
            try {
                var parsedMsg = JSON.parse(message);
            } catch (err) {
                log.info('Unparsable message from', client);
                server.sendError(conn, 'badMessage');
                return;
            }
            try {
                var handled = parsedMsg.says && parsedMsg.uid && handler.handle(server, conn, parsedMsg);
            } catch (err) {
                log.error('Unexpected error', err, 'handling message from', client);
                log.info(err.stack);
                server.sendError(conn, 'unexpectedError', parsedMsg);
                return;
            }
            if (handled) {
                log.debug('Message', parsedMsg.uid, 'from', client, 'handled successfully');
            } else {
                log.info('Unhandled message from', client);
                var error = (parsedMsg.says && parsedMsg.uid) ? 'unhandledMessage' : 'incompleteMessage';
                server.sendError(conn, error, parsedMsg);
            }
        });

        conn.on('close', function() {
            if (conn.ISM_cid) delete server.clientConns[conn.ISM_cid];
            log.info('Client connection closed', client);
        });
    });

    this.start = function start(port, host) {
        this.httpServer = http.createServer();
        this.sockjsServer.installHandlers(this.httpServer, {prefix: '/ism'});
        this.httpServer.listen(port, host);
        log.info('ism server listening on ' + host + ':' + port);
    }

    this.registerClient = function(cid, conn) {
        if (!this.clientConns[cid]) {
            this.clientConns[cid] = conn;
            conn.ISM_cid = cid;
            return true;
        } else {
            return false;
        }
    }

    this.newClient = function(conn) {
        if (!conn.ISM_cid) {
            var cid = conn.ISM_cid = genUid();
            this.clientConns[cid] = conn;
            return cid;
        } else {
            return conn.ISM_cid;
        }
    }
}


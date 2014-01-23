#!/usr/bin/env node
var db = require('./lib/db')
  , opt = require('optimist')
    .usage('Start an ism game server\nUsage: $0')
    .alias('h', 'host')
    .describe('h', 'host name or address to listen on')
    .default('h', '0.0.0.0')
    .alias('p', 'port')
    .describe('p', 'port number to listen on')
    .default('p', 5557)
    .alias('v', 'verbose')
    .describe('v', 'More verbose logging of client connections')
    .boolean('v')
    .describe('debug', 'Debug logging of all client/server activity')
    .boolean('debug')
    .describe('version', 'Output the software version and exit')
    .boolean('version')
    .alias('d', 'database')
    .describe('d', 'path to game database directory (will be created on start)');

if (db.defaultPath()) {
    opt.default('d', db.defaultPath())
} else {
    opt.demand('d')
}

var argv = opt.argv;

if (argv.version) {
    var serverVersion = require('./package.json').version;
    console.log('ism server version ' + serverVersion);
    console.log('node version ' + process.version);
    process.exit();
}

if (argv.help) {
    opt.showHelp();
    process.exit();
}

require('./lib/logging').configure({
    verbose: argv.verbose
  , debug: argv.debug
});

var Server = require('./lib/server').Server
  , db = db.open(argv.database)
  , ism = new Server(db);
ism.start(argv.port, argv.host, function(info) {
    process.title = 'ism server ' + info.host + ':' + info.port
})


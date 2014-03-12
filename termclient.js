#!/usr/bin/env node
var prefs = require('./lib/prefs')
  , path = require('path')
  , opt = require('optimist')
    .usage('Terminal client for the Ism strategy game\nUsage: $0')
    .alias('v', 'verbose')
    .describe('v', 'More verbose logging')
    .boolean('v')
    .describe('debug', 'Debug logging of all client/server activity')
    .boolean('debug')
    .describe('version', 'Output the software version and exit')
    .boolean('append')
    .describe('append', 'Append to log file instead of truncating it at startup')
    .boolean('version')
    .describe('prefs', 'Path to prefs file (will be created if necessary)')

if (prefs.defaultClientPath()) {
    opt.default('prefs', prefs.defaultClientPath())
} else {
    opt.demand('prefs')
}

var argv = opt.argv

if (argv.version) {
    var clientVersion = require('./package.json').version
    console.log('ism version ' + clientVersion)
    console.log('node version ' + process.version)
    process.exit()
}

if (argv.help) {
    opt.showHelp()
    process.exit()
}

var logging = require('./lib/logging')
logging.configure({
    verbose: argv.verbose
  , debug: argv.debug
  , filePath: path.join(path.dirname(argv.prefs), 'client.log')
  , append: argv.append
})

prefs.usePath(argv.prefs)

var app = require('./termclient/app')
  , termApp = app.create()
termApp.showTitle()

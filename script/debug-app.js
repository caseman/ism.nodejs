#!/usr/bin/env node
var logging = require('../lib/logging')
  , app = require('../termclient/app')
  , ui = require('../termclient/ui')
  , extend = require('extend')
  , argv = require('optimist').string('cid').argv;

logging.configure(true, true);
logging.useFile(logging.defaultClientPath());

var fileOpts = require(process.env.HOME + '/.ism/client-options.json');
var app = app.create(extend({}, fileOpts, argv));
app.start();

ui.screen.key('escape', process.exit);

#!/usr/bin/env node
var logging = require('../lib/logging')
  , app = require('../termclient/app');

logging.configure(true, true);
logging.useFile(logging.defaultClientPath());

var app = app.create();
app.start();

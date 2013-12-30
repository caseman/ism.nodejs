#!/usr/bin/env node
var logging = require('../lib/logging')
  , app = require('../termclient/app');

logging.configure(true, true);
logging.useStderr = true;

var app = app.create();
app.start();

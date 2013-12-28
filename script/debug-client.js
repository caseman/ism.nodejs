#!/usr/bin/env node
var logging = require('../lib/logging')
  , client = require('../client/client');

logging.configure(true, true);

var myClient = client.create(5557, '0.0.0.0');

myClient.on('connected', function() {
    myClient.handshake(function(whatev) {
        console.log('handshake successful', whatev);
    });
});



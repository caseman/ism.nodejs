#!/usr/bin/env node
var logging = require('../lib/logging')
  , client = require('../lib/client')
  , util = require('util');

logging.configure(true, true);
logging.useFile(logging.defaultClientPath());

var myClient = client.create(5557, '0.0.0.0');

function gameCreated(game) {
    console.log('\nCreated game', game);
    myClient.send({says:'join', game:game.uid});
    myClient.send({says:'startGame', game:game.uid});
}

myClient.on('connection', function() {
    myClient.handshake(function() {
        console.log('handshake successful cid =', this.cid);
        myClient.createGame(['small'], gameCreated, function(progress) {
            util.print('.');
        });
    });
});



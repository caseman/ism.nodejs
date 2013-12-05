#!/usr/bin/env node
var sockjsc = require('sockjs-client');
var version = require('../package.json').version;

var client = sockjsc.create('http://0.0.0.0:5557/ism');

client.on('connection', function() {
    console.log('connected');
});

client.on('data', function(msg) {
    console.log('received:', msg);
});

client.on('error', function(err) {
    console.log('error:', err);
});

client.on('close', function() {
    console.log('connection closed');
});

function send(obj) {
    var data = JSON.stringify(obj)
    client.write(data);
    console.log('sent:', data);
}

send({says:'hi', uid:'hello', clientVersion:version});



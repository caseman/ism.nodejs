#!/usr/bin/env node

var argv = require('optimist')
    .usage('Create an ism map file.\nUsage: $0 [outfile]')
    .demand('c').alias('c', 'config')
    .describe('c', 'Load the map configuration from a file')
    .alias('s', 'seed')
    .describe('s', 'Specify an integer map seed. Overrides any seed in the map config')
    .argv;
var fs = require('fs');
var util = require('util');
var zlib = require('zlib');
var JSONStream = require('JSONStream');
var Map = require('../lib/map').Map;

var outFileName = argv._[0];
if (!outFileName) {
    console.error('Missing output file name.\nUsage: ' + argv.$0 + ' -c [configfile] [outfile]');
    process.exit(2)
}

var mapConfig = JSON.parse(fs.readFileSync(argv.config));
if (argv.seed) mapConfig.seed = argv.seed;

var map = new Map(mapConfig, function(progress) {
    if (progress < 100) {
        if (progress == 1) util.print('Generating: ');
        if ((progress % 2) == 0) util.print('▓');
    } else {
        util.puts(' done ' + progress);
    }
});

var json = JSONStream.stringify();
var gzip = zlib.createGzip();
var out = fs.createWriteStream(outFileName);
json.pipe(gzip).pipe(out);

json.write(map);
json.end();


var map = require('./lib/map');
var fs = require('fs');
map.readMapFromStream(fs.createReadStream('test.map.gz'), function(x) {console.log(x.tiles.length)})

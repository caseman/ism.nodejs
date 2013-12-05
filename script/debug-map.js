var fs = require('fs');
var util = require('util');
var Map = require('./lib/map').Map;
var mapConfig = require('./map');

var TILE_COLORS = {
    "ocean": "30 50 180\n",
    "coast": "64 64 255\n",
    "grassland": "98 128 0\n", 
    "floodplain": "20 148 0\n", 
    "forest": "30 100 0\n",
    "jungle": "20 100 100\n",
    "marsh": "60 65 20\n",
    "plains": "150 100 0\n",
    "desert": "216 152 108\n",
    "hill": "100 90 35\n",
    "mountain": "180 180 170\n",
    "glacier": "220 220 255\n",
    "tundra": "225 200 225\n",
    "river": "100 100 255\n",
    "flat": "0 0 0\n"
}

var map = new Map(mapConfig, function(progress) {
    if (progress < 100) {
        if ((progress % 2) == 0) util.print('.');
    } else {
        util.puts('done ' + progress);
    }
});

var f = fs.openSync('map.ppm', 'w');
fs.writeSync(f, "P3 " + map.width + " " + map.height + " 255\n");
var counts = {};
for (var y = 0; y < map.height; y++) {
  for (var x = 0; x < map.width; x++) {
      var tile = map.tiles[x][y];
      var color = TILE_COLORS[tile.biome] || TILE_COLORS[tile.terrain]
      if (!color) console.log(tile.terrain);
      if (0) {
        var red = Math.floor(128 * tile.temperature);
        color = red + ' 0 ' + (255 - red) + '\n';
      }
      var biome = tile.biome || tile.terrain;
      counts[biome] = (counts[biome] || 0) + 1;
      fs.writeSync(f, color);
  }
}
fs.close(f);
console.dir(counts);

/*
var st = fs.createWriteStream('map.ppm');
st.once('open', function(fd) {
  st.write("P3\n");
  st.write(map.width + " " + map.height + "\n");
  st.write("255\n");
  for (var y = 0; y < map.height; y++) {
    for (var x = 0; x < map.width; x++) {
      var color = TILE_COLORS[map.tiles[x][y].terrain];
      if (color) {
        st.write(color);
      } else {
        util.error('Unknown terrain type "' + map.tiles[x][y].terrain + '"');
      }
    }
    util.print('|');
  }
  st.end();
  st.on('finish', function() {
    console.error('written');
  });
});
*/

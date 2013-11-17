var fs = require('fs');
var util = require('util');
var Map = require('./lib/map').Map;
var mapConfig = require('./map');

var TILE_COLORS = {
    "ocean": "0 20 150\n",
    "coast": "64 64 255\n",
    "lake": "72 72 255\n",
    "plain": "32 150 64\n",
    "hill": "100 100 0\n",
    "mountain": "150 150 180\n",
    "ice": "180 180 255\n",
    "snow": "230 230 255\n",
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
for (var y = 0; y < map.height; y++) {
  for (var x = 0; x < map.width; x++) {
      var color = TILE_COLORS[map.tiles[x][y].terrain];
      fs.writeSync(f, color);
  }
}
fs.close(f);

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

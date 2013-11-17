var fs = require('fs');
var util = require('util');
var fbm = require('./lib/fbmnoise');
var Noise = require('noisejs').Noise;

var noise2 = fbm.FbmNoise2(1.5, 1, 12);
var st = fs.createWriteStream('noise.pgm');
st.once('open', function(fd) {
  st.write("P2\n");
  st.write("256 256 \n");
  st.write("255\n");
  for (var y = 0; y < 256; y++) {
    for (var x = 0; x < 256; x++) {
        var val = noise2(x / 256, y / 256);
        st.write(Math.floor(val * 128 + 127) + '\n');
    }
  }
  st.end();
});


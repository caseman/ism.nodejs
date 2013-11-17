var Noise = require('noisejs').Noise;

var RADIUS_F = 0.5 / 3.14159265359;

function fastSin(x) {
    var sx = 2 * x - 1;
    return -4 * (sx - sx * Math.abs(sx));
}

function fastCos(x) {
    return fastSin(x <= 0.75 ? x + 0.25 : 1.25 - x);
}

exports.FbmNoise3 = FbmNoise3 = function FbmNoise3(seed, octaves, persistence, lacunarity) {
    var octaves = octaves || 1,
        persistence = persistence || 0.5,
        lacunarity = lacunarity || 2,
        noise = new Noise(seed || Math.random());
    return function(x, y, z) {
        var freq = 1.0,
            amp = 1.0,
            max = 0,
            val = 0;
        for (var i = 0; i < octaves; i++) {
            val += noise.perlin3(x * freq, y * freq, z * freq) * amp;
            max += amp;
            freq *= lacunarity;
            amp *= persistence;
        }
        return val / max;
    }
}

exports.FbmNoise2 = function FbmNoise2(scale, seed, octaves, persistence, lacunarity) {
    var r = scale * RADIUS_F, 
        noise3 = FbmNoise3(seed, octaves, persistence, lacunarity);
    return function(x, y) {
        var xf = x % 1;
        return noise3(fastSin(xf) * r, y * scale, fastCos(xf) * r);
    }
}


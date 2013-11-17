var FbmNoise2 = require('fbmnoise').FbmNoise2;

function log10(x) {
    return Math.log(x) / Math.LN10;
}

var Map = function Map(params, progressCb) {
    this.params = params;
    this.width = params.width;
    this.height = params.height;
    this.tiles = this.makeTiles(progressCb);
}
Map.prototype.makeTiles = function(progressCb) {
    var tiles = [], row, tile;
    var tileFuncs = this.tileFuncs(this.params);
    var progress = 0;
    for (var x = 0; x < this.width; x++) {
        tiles[x] = [];
        for (var y = 0; y < this.height; y++) {
            tiles[x][y] = tile = {
                x: x, y: y,
                equitorialDistance: Math.abs(this.height - y * 2.0) / this.height,
                longitude: x / this.width,
                latitude: (this.height - y) / this.height
            };
            for (var i = 0; i < tileFuncs.length; i++) {
                tileFuncs[i](tile);
            }
        }
        if (progressCb && (x * 100 / this.width) >= progress) {
            progressCb(++progress);
        }
    }
    return tiles;
}
Map.prototype.tileFuncs = function(params) {
    var elevationNoise = FbmNoise2(params.landMassScale, params.seed, params.coastComplexity),
        faultNoise = FbmNoise2(params.faultScale, params.seed, params.faultComplexity),
        erodeNoise = FbmNoise2(params.faultErosionScale, params.seed, params.faultErosionComplexity, 0.85),
        ruggedNoise = FbmNoise2(params.hillScale, params.seed, params.hillComplexity);

    return [
        function elevation(tile) {
            var height = elevationNoise(tile.longitude, tile.latitude) * 0.5 + 0.5,
                // Compensate height to drop off near the poles for north and south seas
                poleAdjust =  log10(10 - tile.equitorialDistance * params.equitorialMultiplier);
            tile.baseHeight = height * poleAdjust;
        },
        function faults(tile) {
            var FL = faultNoise(tile.longitude, tile.latitude),
                thold = Math.max(0, ((1 - Math.abs(FL)) - params.faultThreshold) / (1 - params.faultThreshold));
            FL *= log10(10 - Math.abs(erodeNoise(tile.longitude, tile.latitude)))
            tile.faultLevel = FL * log10(thold * 9.0 + 1.0);
            tile.elevation = tile.baseHeight + tile.faultLevel * 0.5;
        },
        function ruggedness(tile) {
            tile.ruggedness = Math.abs(ruggedNoise(tile.longitude, tile.latitude));
        },
        function terrainType(tile) {
            var freezeLevel = log10(10 - tile.equitorialDistance * params.equitorialMultiplier * 2);
            if (tile.elevation + tile.elevation * tile.ruggedness > freezeLevel * params.iceThreshold) {
                tile.isLand = true;
                tile.terrain = 'ice';
            } else if (tile.elevation < params.oceanLevel + params.coastThreshold) {
                tile.isLand = false;
                if (params.oceanLevel - tile.baseHeight > params.coastThreshold) {
                    tile.terrain = 'ocean';
                } else {
                    tile.terrain = 'coast';
                }
            } else {
                tile.isLand = true;
                if (tile.elevation * tile.ruggedness > freezeLevel * params.snowThreshold) {
                    tile.terrain = 'snow';

                } else if (tile.ruggedness > params.mountainRuggednessThreshold || tile.faultLevel > params.mountainFaultThreshold) {
                    tile.terrain = 'mountain';
                } else if (tile.ruggedness + tile.faultLevel > params.hillThreshold) {
                    if (tile.ruggedness > tile.faultLevel) {
                        tile.terrain = 'hill';
                    } else {
                        tile.isLand = false;
                        tile.terrain = 'lake';
                    }
                } else {
                    tile.terrain = "plain";
                }
            }
        }
    ];
}

exports.Map = Map;


var FbmNoise2 = require('fbmnoise').FbmNoise2;

function log10(x) {
    return Math.log(x) / Math.LN10;
}

var windVectors = {
  "NW": [-1,  1]
, "NE": [ 1,  1]
, "SE": [ 1, -1]
, "SW": [-1, -1]
}

var rainContributions = {
  "ocean": 0.5
, "coast": 0.2
, "hill": -0.1
, "mountain": -0.3
, "snow": -0.2
, "ice": -0.2
}

var Map = function Map(params, progressCb) {
    this.params = params;
    this.width = params.width;
    this.height = params.height;
    this.tiles = this.makeTiles(progressCb);
}
Map.prototype.makeTiles = function(progressCb) {
    var tiles = [];
    var tileFuncs = this.tileFuncs(this.params);
    var progress = 0;
    for (var x = 0; x < this.width; x++) {
        tiles[x] = [];
        for (var y = 0; y < this.height; y++) {
            tiles[x][y] = {
                x: x, y: y,
                equitorialDistance: Math.abs(this.height - y * 2.0) / this.height,
                longitude: x / this.width,
                latitude: (this.height - y) / this.height
            };
        }
    }
    for (var i = 0; i < tileFuncs.length; i++) {
        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
                tileFuncs[i](tiles[x][y], tiles);
            }
            if (progressCb && ((y * (i+1)) * 100 / (this.width * tileFuncs.length)) >= progress) {
                progressCb(++progress);
            }
        }
    }
    return tiles;
}
Map.prototype.tileFuncs = function(params) {
    var elevationNoise = FbmNoise2(params.landMassScale, params.seed, params.coastComplexity),
        faultNoise = FbmNoise2(params.faultScale, params.seed, params.faultComplexity),
        erodeNoise = FbmNoise2(params.faultErosionScale, params.seed, params.faultErosionComplexity, 0.85),
        ruggedNoise = FbmNoise2(params.hillScale, params.seed, params.hillComplexity),
        prevailingWindDirs = this.prevailingWindDirs,
        prevailingWindDirCount = prevailingWindDirs.length - 1;
        width = this.width,
        height = this.height;

    var windDirForTile = function(tile) {
        var i = Math.floor(tile.latitude * prevailingWindDirCount);
        return prevailingWindDirs[i];
    }

    var flowRiver = function(tile, tiles) {
        var lowest, 
            x = tile.x,
            y = tile.y,
            left = tiles[x > 0 ? x - 1 : x + width - 1],
            right = tiles[x < (width - 1) ? x + 1 : 0],
            neighbors = [left[y-1], tiles[x][y-1], right[y-1], left[y], right[y], left[y+1], tiles[x][y+1], right[y+1]];
        tile.biome = 'river';
        tile.isLand = false;
        while (!lowest || lowest.biome == 'river' && neighbors.length) lowest = neighbors.pop();
        while (neighbors.length) {
            neighbor = neighbors.pop();
            if (neighbor && neighbor.elevation < lowest.elevation && neighbor.biome != 'river') {
                lowest = neighbor;
            }
        }
        if (lowest && lowest.isLand) {
            flowRiver(lowest, tiles);
        }
    }

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
            if (tile.elevation < params.oceanLevel + params.coastThreshold) {
                tile.isLand = false;
                if (params.oceanLevel - tile.baseHeight > params.coastThreshold) {
                    tile.terrain = 'ocean';
                } else {
                    tile.terrain = 'coast';
                }
            } else {
                tile.isLand = true;
                if (tile.ruggedness > params.mountainRuggednessThreshold || tile.faultLevel > params.mountainFaultThreshold) {
                    tile.terrain = 'mountain';
                } else if (tile.ruggedness + tile.faultLevel > params.hillThreshold) {
                    if (tile.ruggedness > tile.faultLevel) {
                        tile.terrain = 'hill';
                    } else {
                        tile.isLand = false;
                        tile.terrain = 'lake';
                    }
                } else {
                    tile.terrain = "flat";
                }
            }
        },
        function rainfall(tile, tiles) {
            if (tile.isLand) {
                var windDir = windDirForTile(tile),
                    wx = windVectors[windDir][0],
                    wy = windVectors[windDir][1],
                    coneWidth = params.moistureReach * -wx,
                    coneHeight = params.moistureReach * -wy,
                    rainfall = 0;
                for (var dy = 0; dy != coneHeight; dy -= wy) {
                    var y = tile.y + dy;
                    if (y < 0 || y >= height) break;
                    for (var dx = 0; dx != coneWidth; dx -= wx) {
                        var x = tile.x + dx;
                        x += (x < 0 ? width : x >= width ? -width : 0);
                        var dist2 = dx * dx + dy * dy;
                        var rain = rainContributions[tiles[x][y].terrain];
                        if (rain && dist2 > 0) {
                            rainfall += rain * params.rainMultiplier / dist2;
                        }
                    }
                    coneWidth -= wx;
                }
                tile.rainfall = rainfall > 0 ? rainfall : 0;
            }
        },
        function rivers(tile, tiles) {
            if (tile.isLand) {
                // TODO use a seedable rng
                if ((tile.rainfall > params.riverRainThreshold && Math.random() <= params.riverStartProbability)
                    || Math.random() <= 0.001) {
                    flowRiver(tile, tiles);
                }
            }
        },
        /*
        function biome(tile) {
            freezeLevel = log10(10 - tile.equitorialDistance * params.equitorialMultiplier * 2);
            if (tile.elevation + tile.elevation * tile.ruggedness > freezeLevel * params.iceThreshold) {
                tile.biome = 'glacier';
            } else {
            if (tile.elevation * tile.ruggedness > tile.freezeLevel * params.snowThreshold) {
                tile.terrain = 'snow';
            } else
        }
        */
    ];
}
Map.prototype.prevailingWindDirs = ['SW', 'NE', 'SW', 'NW', 'SW', 'NE'];

exports.Map = Map;


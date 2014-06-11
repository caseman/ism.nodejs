var FbmNoise2 = require('./fbmnoise').FbmNoise2
  , grid = require('./grid')
  , zlib = require('zlib')
  , JSONStream = require('JSONStream')
  , aStar = require('a-star');

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
}

var Map = function Map(params, progressCb) {
    if (params) {
        if (!params.seed) params.seed = Math.random();
        this.params = params;
        this.width = params.width;
        this.height = params.height;
        this.tiles = this.makeTiles(progressCb);
        this.startLocations = this.findStartingLocations(params.startLocations || 36)
    }

    this.tile = function(x, y) {
        return this.tiles[(x + this.width) % this.width][y];
    }

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
                key: x + ',' + y,
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
        prevailingWindDirCount = prevailingWindDirs.length - 1,
        width = this.width,
        height = this.height;

    var windDirForTile = function(tile) {
        var i = Math.floor(tile.latitude * prevailingWindDirCount);
        return prevailingWindDirs[i];
    }

    var neighborTiles = function(tile, tiles, xOffset) {
        var x = tile.x,
            y = tile.y,
            left, right;
        if (xOffset) x = (x + xOffset) % width;
        if (y % 2) {
            left = tiles[x % width];
            right = tiles[(x + 1) % width];
        } else {
            left = tiles[(x - 1 + width) % width];
            right = tiles[x % width];
        }
        return [left[y-1], tiles[x][y-2], right[y-1],
            tiles[(x - 1 + width) % width][y], tiles[(x + 1) % width][y],
            left[y+1], tiles[x][y+2], right[y+1]];
    }

    var riverElevation = function(tile, tiles) {
        var elevation = tile.elevation + tile.ruggedness * 0.25;
        return elevation + elevation * (tile.riverFlow || 0) * params.riverFlowFactor;
    }

    // flow river water from a starting tile
    var flowRiver = function(tile, tiles, last, remaining) {
        var lowest, 
            elevation,
            lowestElevation,
            remaining = remaining != undefined ? remaining : width,
            neighbors = neighborTiles(tile, tiles);
        tile.riverFlow = (tile.riverFlow || 0) + 1;
        lowest = tile;
        lowestElevation = riverElevation(lowest, tiles);
        while (neighbors.length) {
            neighbor = neighbors.pop();
            if (neighbor) {
                var elevation = riverElevation(neighbor, tiles);
                if (elevation < lowestElevation) {
                    lowest = neighbor;
                    lowestElevation = elevation;
                }
            }
        }
        if (--remaining && lowest && !lowest.isWater) {
            return flowRiver(lowest, tiles, tile, remaining);
        } else {
            return lowest;
        }
    }

    // cut a river channel from a starting tile by finding a path through the river flow
    var channelRiver = function(start, end, tiles) {
        var river = aStar({
            start: start
          , isEnd: function(tile) {
                return tile === end || tile.isWater;
            }
          , neighbor: function(tile) {
                return neighborTiles(tile, tiles).filter(
                    function(tile) {return tile && (!!tile.riverFlow || tile.isWater)}
                );
            }
          , distance: function(a, b) {
                var d = 1 + (a.x === b.x && a.y !== b.y) + (a.x !== b.x && a.y === b.y);
                return b.isLand ? d*d : 0;
            }
          , heuristic: function(tile) {
                var dy = end.y - start.y
                  , dx = end.x - start.x;
                return Math.sqrt(dx*dx + dy*dy);
            }
          , hash: function(tile) {
                return tile.x + ',' + tile.y;
            }
        });
        var riverify = function(tile) {
            if (tile && !tile.isWater) {
                tile.biome = 'river';
                tile.isWater = true;
            }
        }
        var size = 0;
        if (river.status == 'success' && river.path.length > 5) {
            river.path.forEach(function(tile) {
                riverify(tile);
                if (size > 1) {
                    var x = (tile.x + 1) % width;
                    riverify(tiles[x][tile.y]);
                }
                size += params.riverGrowthFactor;
            });
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
                tile.isWater = true;
                if (params.oceanLevel - tile.elevation > params.coastThreshold) {
                    tile.terrain = 'ocean';
                } else {
                    tile.terrain = 'coast';
                }
            } else {
                tile.isLand = true;
                tile.isWater = false;
                if (tile.ruggedness > params.mountainRuggednessThreshold || tile.faultLevel > params.mountainFaultThreshold) {
                    tile.terrain = 'mountain';
                } else if (tile.ruggedness + tile.faultLevel > params.hillThreshold) {
                    tile.terrain = 'hill';
                } else {
                    tile.terrain = "flat";
                }
            }
        },
        function temperature(tile) {
            tile.temperature = (1 - tile.equitorialDistance) * params.latitudeTempFactor;
            if (tile.isLand) {
                tile.temperature /= tile.elevation * params.elevationTempFactor;
            }
        },
        function rainfall(tile, tiles) {
            if (tile.isLand) {
                var windDir = windDirForTile(tile),
                    wx = windVectors[windDir][0],
                    wy = windVectors[windDir][1],
                    coneWidth = params.moistureReach * -wx,
                    coneHeight = params.moistureReach * -wy,
                    rainfall = params.rainBaseline;
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
                var rand = Math.random()
                  , mountain = tile.terrain == 'mountain'
                  , chance = (mountain) ? rand : rand * rand * rand * rand;
                if (rand > 1 - params.riverStartProbability 
                    && (mountain || tile.elevation * chance > params.riverElevationThreshold)
                    && tile.rainfall * chance > params.riverRainThreshold) {
                    var end = flowRiver(tile, tiles);
                    channelRiver(tile, end, tiles);
                }
            }
        },
        function biome(tile) {
            var freezeLevel = log10(10 - tile.equitorialDistance * params.equitorialMultiplier * 2)
              , riverFlow = tile.riverFlow || 0
              , moisture = tile.rainfall + riverFlow * 0.33;
            if (tile.elevation + tile.elevation * tile.ruggedness > freezeLevel * params.iceThreshold || riverFlow && tile.elevation * tile.elevation > tile.temperature) {
                tile.biome = 'glacier';
            } else if (tile.isLand && !tile.biome) {
                if (tile.ruggedness > tile.temperature * tile.temperature) {
                    if (tile.terrain != 'mountain' && moisture > 0 && tile.temperature > 0.2 && Math.random() < params.forestDensity) {
                        tile.biome = 'taiga';
                    } else {
                        tile.biome = 'tundra';
                    }
                } else if (tile.terrain != 'mountain') {
                    if ((moisture - tile.ruggedness - tile.temperature > 4 || riverFlow > tile.temperature + 1.1) && Math.random() < params.marshDensity) {
                        tile.biome = 'marsh';
                    } else if (tile.temperature > 0.8 && tile.temperature * moisture > 2 && tile.ruggedness > 0.1) {
                        tile.biome = 'jungle';
                    } else if (moisture > tile.temperature && tile.ruggedness > 0.1 && Math.random() < params.forestDensity) {
                        tile.biome = 'forest'
                    } else if (moisture > tile.ruggedness * 5 + tile.temperature * 2) {
                        if (tile.temperature > 0.25) {
                            tile.biome = 'grassland';
                        } else {
                            tile.biome = 'taiga';
                        }
                    } else if (moisture + 0.5 > tile.temperature * tile.temperature) {
                        tile.biome = 'plains';
                    } else {
                        tile.biome = 'desert';
                    }
                }
            }
            if (tile.biome) {
                tile.type = tile.terrain + '-' + tile.biome;
            } else {
                tile.type = tile.terrain;
            }
        },
    ];
}
Map.prototype.prevailingWindDirs = ['SW', 'NE', 'SW', 'NW', 'SW', 'NE'];
Map.prototype.findStartingLocations = function(count) {
    var map = this;
    var goodBiomes = {grassland:true, plains:true, forest:true}
    var locations = [];
    var separation = Math.floor(Math.min(map.width, map.height) / (Math.sqrt(count) * 2));
    var randomDir = function() {
        return Math.round(Math.random() * 6 - 3);
    }
    var fixStartLocation = function(x, y, tries) {
        x += randomDir();
        y += randomDir();
        if (y < 0 || y >= map.height) return;
        x += (x < 0) ? map.width : (x >= map.width) ? -map.width : 0;
        if (tries > 0) {
            var tile = map.tiles[x][y];
            if (tile.isLand && goodBiomes[tile.biome]) {
                return [x, y];
            } else {
                return fixStartLocation(x, y, --tries);
            }
        }
    }
    for (var y = 2; y < (map.height / separation) - 2; y++) {
        for (var x = 0; x < (map.width / separation); x++) {
            var my = Math.round(y * separation + (x % 2) * (separation / 2));
            var startLoc = fixStartLocation(x * separation, my, Math.round(separation / 3));
            if (startLoc) locations.push(startLoc);
        }
    }
    return locations;
}

exports.Map = Map;
exports.create = function create(params, progressCb) {
    return new Map(params, progressCb);
}

exports.readMapFromStream = function readMapFromStream(readerStream, callback) {
    var gzip = zlib.createGunzip();
    var json = JSONStream.parse([true]);
    json.on('data', function(data) {
        var map = new Map;
        map.params = data.params;
        map.width = data.width;
        map.height = data.height;
        map.tiles = data.tiles;
        map.startLocations = data.startLocations;
        callback(map);
    });
    readerStream.pipe(gzip).pipe(json);
}


var FbmNoise2 = require('./fbmnoise').FbmNoise2;
var grid = require('./grid');
var zlib = require('zlib');
var JSONStream = require('JSONStream');

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

    var neighborTiles = function(tile, tiles) {
        var x = tile.x,
            y = tile.y,
            left = tiles[x > 0 ? x - 1 : x + width - 1],
            right = tiles[x < (width - 1) ? x + 1 : 0];
        return [left[y-1], tiles[x][y-1], right[y-1], left[y], right[y], left[y+1], tiles[x][y+1], right[y+1]];
    }

    var riverElevation = function(tile) {
        return tile.elevation + tile.elevation * (tile.riverFlow || 0) * params.riverFlowFactor;
    }

    var flowRiver = function(tile, tiles, last, remaining) {
        var lowest, 
            elevation,
            lowestElevation,
            remaining = remaining != undefined ? remaining : width,
            neighbors = neighborTiles(tile, tiles);
        tile.biome = 'river';
        tile.riverFlow = (tile.riverFlow || 0) + 1;
        //tile.isLand = false;
        while ((!lowest || lowest === last) && neighbors.length) lowest = neighbors.pop();
        lowestElevation = riverElevation(lowest);
        while (neighbors.length) {
            neighbor = neighbors.pop();
            if (neighbor && neighbor !== last) {
                if (neighbor.elevation < lowestElevation) {
                    lowest = neighbor;
                    lowestElevation = riverElevation(neighbor);
                }
            }
        }
        if (--remaining && lowest && lowest.isLand) {
            flowRiver(lowest, tiles, tile, remaining);
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
                if (params.oceanLevel - tile.elevation > params.coastThreshold) {
                    tile.terrain = 'ocean';
                } else {
                    tile.terrain = 'coast';
                }
            } else {
                tile.isLand = true;
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
                if ((tile.rainfall > params.riverRainThreshold && Math.random() <= params.riverStartProbability)
                    || Math.random() <= 0.001) {
                    flowRiver(tile, tiles);
                }
            }
        },
        function pruneLakes(tile, tiles) {
            if (tile.biome == 'river') {
                var neighborFlow = neighborTiles(tile, tiles).reduce(
                    function(value, neighbor) {
                        if (neighbor && neighbor.riverFlow) {
                            value += neighbor.riverFlow;
                        }
                        return value;
                    }, 0);
                if (neighborFlow > tile.riverFlow * 7 || neighborFlow == 0) {
                    tile.biome = undefined;
                    tile.rainfall *= 3;
                }
            }
        },
        function biome(tile) {
            var freezeLevel = log10(10 - tile.equitorialDistance * params.equitorialMultiplier * 2);
            if (tile.elevation + tile.elevation * tile.ruggedness > freezeLevel * params.iceThreshold) {
                tile.biome = 'glacier';
            } else if (tile.isLand && !tile.biome) {
                if (tile.ruggedness > tile.temperature * tile.temperature) {
                    if (tile.terrain != 'mountain' && tile.rainfall > 0 && tile.temperature > 0.2 && Math.random() < params.forestDensity) {
                        tile.biome = 'taiga';
                    } else {
                        tile.biome = 'tundra';
                    }
                } else if (tile.terrain != 'mountain') {
                    if (tile.rainfall > 5 && Math.random() < params.marshDensity) {
                        tile.biome = 'marsh';
                    } else if (tile.temperature > 0.8 && tile.rainfall > 3 && tile.ruggedness > 0.1) {
                        tile.biome = 'jungle';
                    } else if (tile.rainfall > tile.temperature && tile.ruggedness > 0.1 && Math.random() < params.forestDensity) {
                        tile.biome = 'forest'
                    } else if (tile.rainfall > tile.ruggedness * 5 + tile.temperature * 2) {
                        if (tile.temperature > 0.25) {
                            tile.biome = 'grassland';
                        } else {
                            tile.biome = 'taiga';
                        }
                    } else if (tile.rainfall + 0.5 > tile.temperature * tile.temperature) {
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

var terrainSightElevations = {
  ocean: -1, coast: -1, flat: 0, hill: 1, mountain: 2
};

var biomeSightModifiers = {
  forest: {from: 0, through: 1}
, taiga: {from: 0, through: 1}
, jungle: {from: 0, through: 2}
, glacier: {from: 0, through: 1}
, river: {from: -1, through: -1}
, marsh: {from: -1, through: 0}
};

exports.sightFrom = function sightFrom(map, location, radius, visitFunc) {
    var cx = location[0], cy = location[1], cTile = map.tiles[cx][cy],
        startElev = terrainSightElevations[cTile.terrain],
        seen = {};
    if (biomeSightModifiers[cTile.biome]) {
        startElev += biomeSightModifiers[cTile.biome].from;
    }

    grid.visitRangeBounds(cx, cy, radius, function(x, y) {
        grid.visitRayTrace(cx, cy, x, y, function(tx, ty) {
            if (ty < 0 || ty >= map.height) return false;
            tx += (tx < 0) ? map.width : (tx >= map.width) ? -map.width : 0;
            var tileKey = tx + ',' + ty,
                tile = map.tiles[tx][ty],
                elev = terrainSightElevations[tile.terrain];
            if (biomeSightModifiers[tile.biome]) {
                elev += biomeSightModifiers[tile.biome].through;
            }
            if (!seen[tileKey]) {
                visitFunc(tile, elev);
                seen[tileKey] = true;
            }
            return (cx == tx && cy == ty) || startElev >= elev;
        });
    });
}

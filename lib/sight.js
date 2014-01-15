var object = require('./object')
  , map = require('./map')
  , grid = require('./grid');

function look(obj, game) {
    if (obj.sight) {
        var sees = object.eventHandler('sees', obj);
        obj.tilesSeen = {};
        sightFrom(game, obj.location, obj.sight, function(tile) {
            game.objectSeesTile(obj, tile);
            var tileSeen = game.clientCopyTile(tile);
            sees(game, tileSeen, true);
        });
    }
}
exports.look = look;

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

function sightFrom(game, location, radius, visitFunc) {
    var cx = location[0]
      , cy = location[1]
      , centerTile = game.tile(cx, cy)
      , startElev = terrainSightElevations[centerTile.terrain]
      , seen = {};
    if (biomeSightModifiers[centerTile.biome]) {
        startElev += biomeSightModifiers[centerTile.biome].from;
    }

    grid.visitRangeBounds(cx, cy, radius, function(x, y) {
        grid.visitRayTrace(cx, cy, x, y, function(tx, ty) {
            var tile = game.tile(tx, ty);
            if (!tile) return false;
            var elev = terrainSightElevations[tile.terrain];
            if (biomeSightModifiers[tile.biome]) {
                elev += biomeSightModifiers[tile.biome].through;
            }
            if (!seen[tile.key]) {
                visitFunc(tile);
                seen[tile.key] = true;
            }
            return (cx == tx && cy == ty) || startElev >= elev;
        });
    });
}
exports.sightFrom = sightFrom;


var version = require('../package.json').version;
var genUid = require('./uid').genUid;

exports.createGame = function(map, callback) {
    var game = {
      uid: genUid()
    , map: map
    , objects: {}
    , objectIndex: []
    , nations: {}
    , players: []
    , turn: null
    , startMonth: 4
    , turnsPerMonth: 4
    , version: version
    };
    return game;
}

function objectsAtLocation(game, location) {
    var col = game.objectIndex[location[0]];
    if (col) {
        return col[location[1]] || [];
    }
    return [];
}
exports.objectsAtLocation = objectsAtLocation;

function removeObject(game, object) {
    if (object.location) {
        var objects = objectsAtLocation(game, object.location);
        for (var i = 0; i < objects.length; i++) {
            if (objects[i].uid == object.uid) {
                objects.splice(i, 1);
                break;
            }
        }
        object.location = undefined;
    }
    game.objects[object.uid] = undefined;
}
exports.removeObject = removeObject;

function placeObject(game, object, location) {
    removeObject(game, object);
    var col = game.objectIndex[location[0]];
    if (!col) col = game.objectIndex[location[0]] = [];
    var objects = col[location[1]];
    if (!objects) objects = col[location[1]] = [];
    objects.push(object);
    game.objects[object.uid] = object;
    object.location = location;
}
exports.placeObject = placeObject;

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

function uidsAtLocation(game, location) {
    var col = game.objectIndex[location[0]];
    return col && col[location[1]];
}

function objectsAtLocation(game, location) {
    var uids = uidsAtLocation(game, location);
    if (uids) {
        return uids.map(function(uid) { 
            return game.objects[uid];
        });
    }
    return [];
}
exports.objectsAtLocation = objectsAtLocation;

function removeObject(game, object) {
    if (object.location) {
        var uids = uidsAtLocation(game, object.location);
        if (uids) for (var i = 0; i < uids.length; i++) {
            if (uids[i] == object.uid) {
                uids.splice(i, 1);
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
    objects.push(object.uid);
    game.objects[object.uid] = object;
    object.location = location;
}
exports.placeObject = placeObject;

var assert = require('assert');
var version = require('../package.json').version;
var genUid = require('./uid').genUid;

/*
 * Create a new game with a given map
 */
exports.createGame = function(map) {
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

/*
 * Return a list of objects at a particular location in game
 */
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

/*
 * Remove an object from game
 */
function removeObject(game, object) {
    if (object.location) {
        var uids = uidsAtLocation(game, object.location);
        if (uids) for (var i = 0; i < uids.length; i++) {
            if (uids[i] == object.uid) {
                uids.splice(i, 1);
                break;
            }
        }
        delete object.location;
    }
    delete game.objects[object.uid];
}
exports.removeObject = removeObject;

/*
 * Place, or move an object to a particular location in game
 */
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

var objectTypes = {};
var objectHandlers = {};

/*
 * Define an object type with handlers
 */
function defineObjectType(type, handlers) {
    assert(!(type in objectTypes), 'Object type defined twice: ' + type);
    objectTypes[type] = handlers;
    for (var handlerName in handlers) {
        if (!objectHandlers[handlerName]) objectHandlers[handlerName] = {};
        objectHandlers[handlerName][type] = handlers[handlerName];
    }
}
exports.defineObjectType = defineObjectType;

// For testing
exports._clearObjectTypes = function() {
    objectTypes = {};
    objectHandlers = {};
}

/*
 * Create an object of a particular type and optionally place it in a game
 */
function createObject(type, game, location) {
    if (!(type in objectTypes)) {
      console.error('Unknown object type: ' + type);
    }
    var object = {
      uid: genUid()
    , type: type
    }
    if (location) placeObject(game, object, location);
    return object;
}
exports.createObject = createObject;

/*
 * Send an event to a list of objects
 * game and dditional args are passed to each handler
 */
function sendEvent(eventName, objects, game) {
    var args = Array.prototype.slice.call(arguments, 2);
    var handlers = objectHandlers[eventName];
    assert(handlers, 'No handlers registered for event: ' + eventName);
    objects.forEach(function(obj) {
        var handler = handlers[obj.type];
        if (handler) handler.apply(obj, args);
    });
}
exports.sendEvent = sendEvent;

/*
 * Send an event to a list of objects at a location
 * game and additional args are passed to each handler
 */
function sendEventToLocation(eventName, location, game) {
    arguments[1] = objectsAtLocation(game, location);
    sendEvent.apply(this, arguments);
}
exports.sendEventToLocation = sendEventToLocation;

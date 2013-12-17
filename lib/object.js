/* Game objects with simple event handling */

var assert = require('assert')
  , log = require('./logging').log
  , genUid = require('./uid').genUid;

var objectTypes = exports.TYPES = {};
var objectHandlers = {};

/*
 * Define an object type with handlers
 */
function define(type, handlers) {
    assert(!(type in objectTypes), 'Object type defined twice: ' + type);
    objectTypes[type] = handlers;
    for (var handlerName in handlers) {
        if (!objectHandlers[handlerName]) objectHandlers[handlerName] = {};
        objectHandlers[handlerName][type] = handlers[handlerName];
    }
}
exports.define = define;

// For testing
var _saved = {};

exports._clearTypes = function() {
    _saved = {objectTypes: objectTypes, objectHandlers: objectHandlers};
    objectTypes = {};
    objectHandlers = {};
}
exports._restoreTypes = function() {
    objectTypes = _saved.objectTypes;
    objectHandlers = _saved.objectHandlers;
}

/*
 * Create an object of a particular type
 */
function create(type, properties) {
    if (!(type in objectTypes)) {
      log.error('Created unknown object type: ' + type);
    }
    var object = properties || {};
    object.uid = genUid();
    object.type = type;
    return object;
}
exports.create = create;


/*
 * Send an event to a list of objects
 * game and additional args are passed to each handler
 */
function sendEvent(eventName, objects) {
    var handlers = objectHandlers[eventName];
    var args = Array.prototype.slice.call(arguments, 2);
    assert(handlers, 'No handlers registered for event: ' + eventName);
    objects.forEach(function(obj) {
        var handler = handlers[obj.type];
        if (handler) handler.apply(obj, args);
    });
}
exports.sendEvent = sendEvent;



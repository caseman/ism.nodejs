/* Game objects with simple event handling */

var assert = require('assert')
  , log = require('./logging').log
  , genUid = require('./uid').genUid;

var objectTypes = exports.TYPES = {};
var objectHandlers = {};
var objectVisibleProps = {};

/*
 * Define an object type with handlers, and client-visible properties
 */
function define(type, handlers, visibleProperties) {
    assert(!(type in objectTypes), 'Object type defined twice: ' + type);
    objectTypes[type] = handlers;
    for (var handlerName in handlers) {
        if (!objectHandlers[handlerName]) objectHandlers[handlerName] = {};
        objectHandlers[handlerName][type] = handlers[handlerName];
    }
    var defaultVisibleProps = ['uid', 'type', 'createdTurn', 'modifiedTurn', 'location'];
    objectVisibleProps[type] = defaultVisibleProps.concat(visibleProperties || []);
}
exports.define = define;

// For testing
var _saved = {};

exports._clearTypes = function() {
    _saved = {
        objectTypes: objectTypes
      , objectHandlers: objectHandlers
      , objectVisibleProps: objectVisibleProps
    };
    objectTypes = {};
    objectHandlers = {};
    objectVisibleProps = {};
}
exports._restoreTypes = function() {
    objectTypes = _saved.objectTypes;
    objectHandlers = _saved.objectHandlers;
    objectVisibleProps = _saved.objectVisibleProps;
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

/*
 * Return a copy of the object for transmission to the client
 */
function clientCopy(object) {
    var copy = {};
    objectVisibleProps[object.type].forEach(function(propName) {
        if (object[propName] !== undefined) {
            copy[propName] = object[propName];
        }
    });
    return copy;
}
exports.clientCopy = clientCopy;


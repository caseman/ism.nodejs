/* Game objects with simple event handling */

var assert = require('assert')
  , log = require('./logging').log
  , genUid = require('./uid').genUid;

var objectTypes = exports.TYPES = {};
var objectHandlers = {};
var objectPropAccess = {};
var defaultPropAccess = {
    uid: true
  , type: true
  , createdTurn: true
  , modifiedTurn: true
  , location: true
}

/*
 * Define an object type with handlers, and client property access
 */
function define(type, handlers, propertyAccess) {
    assert(!(type in objectTypes), 'Object type defined twice: ' + type);
    objectTypes[type] = handlers;
    for (var handlerName in handlers) {
        if (!objectHandlers[handlerName]) objectHandlers[handlerName] = {};
        objectHandlers[handlerName][type] = handlers[handlerName];
    }
    var propName, access = {};
    for (propName in propertyAccess || {}) {
        access[propName] = propertyAccess[propName];
    }
    for (propName in defaultPropAccess) {
        if (access[propName] === undefined) access[propName] = defaultPropAccess[propName];
    }
    objectPropAccess[type] = access;
}
exports.define = define;

// For testing
var _saved = {};

exports._clearTypes = function() {
    _saved = {
        objectTypes: objectTypes
      , objectHandlers: objectHandlers
      , objectPropAccess: objectPropAccess
    };
    objectTypes = {};
    objectHandlers = {};
    objectPropAccess = {};
}
exports._restoreTypes = function() {
    objectTypes = _saved.objectTypes;
    objectHandlers = _saved.objectHandlers;
    objectPropAccess = _saved.objectPropAccess;
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
 * additional args are passed to each handler
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
 * Return the event handler function for a particular object
 * Use to repeated fire an event for a single object efficiently
 */
function eventHandler(eventName, obj) {
    var handlers = objectHandlers[eventName];
    assert(handlers, 'No handlers registered for event: ' + eventName);
    var handler = handlers[obj.type];
    if (handler) return handler.bind(obj);
}
exports.eventHandler = eventHandler;

/*
 * Return a copy of the object for transmission to the client
 */
function clientCopy(obj, client) {
    if (typeof obj == 'string') obj = client.game.objects[obj];
    if (!obj) return null;
    var propAccess = objectPropAccess[obj.type] || defaultPropAccess;
    var access, propValue, copy = {};
    Object.keys(propAccess).forEach(function(propName) {
        access = propAccess[propName];
        if (typeof access == 'function') {
            propValue = access(obj, client);
            if (propValue !== undefined) copy[propName] = propValue;
        } else if (access && obj[propName] !== undefined) {
            copy[propName] = obj[propName];
        }
    });
    return copy;
}
exports.clientCopy = clientCopy;

function clientCopyAll(objects, client) {
    return objects.map(function(obj) {
        return clientCopy(obj, client);
    });
}
exports.clientCopyAll = clientCopyAll;


/* helpers for leveldb */

var path = require('path')
  , fs = require('fs')
  , level = require('level')
  , log = require('./logging').log;

exports.key = function key() {
    var parts = Array.prototype.slice.call(arguments);
    parts = parts.map(function(e) {return e.uid || e});
    return parts.join('~');
}

function mkdir(dirPath) {
    var parent = path.dirname(dirPath);
    if (!fs.existsSync(parent)) mkdir(parent);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
}

exports.open = function open(dbPath, cb) {
    log.debug('Opening db at:', dbPath);
    mkdir(path.dirname(dbPath));
    return level(dbPath, {
        valueEncoding: 'json'
    }, cb);
}

exports.defaultPath = function defaultPath() {
    if (process.env.HOME) {
        return path.join(process.env.HOME, '.ism', 'db')
    }
}


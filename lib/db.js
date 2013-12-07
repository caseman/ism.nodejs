/* helpers for leveldb */

var level = require('level');

exports.key = function key() {
    var parts = Array.prototype.slice.call(arguments);
    parts = parts.map(function(e) {return e.uid || e});
    return parts.join('~');
}

exports.open = function open(path) {
    return level(path, {
        cacheSize: 32 * 1024 * 1024
      , valueEncoding: 'json'
    });
}

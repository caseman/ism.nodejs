var path = require('path')
  , fs = require('fs')
  , util = require('util')
  , nullLogger = function() {};

var log = {
    debug: nullLogger
  , info: nullLogger
  , error: nullLogger
}
exports.log = log;

var LOG_WRITER = console;

var mkLogger = function(prefix) {
    var logger = function() {
        var dateStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
        var args = [dateStr, prefix].concat(Array.prototype.slice.call(arguments));
        LOG_WRITER.log.apply(LOG_WRITER, args);
    }
    return logger;
}

exports.configure = function(verbose, debug) {
    log.error = mkLogger('ERROR');
    log.info = verbose ? mkLogger('INFO') : nullLogger;
    log.debug = debug ? mkLogger('DEBUG') : nullLogger;
}

exports.defaultClientPath = function() {
    if (process.env.HOME) {
        return path.join(process.env.HOME, '.ism', 'client.log')
    }
}

exports.useFile = function(filePath) {
    var dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);

    var stream = fs.createWriteStream(filePath);
    LOG_WRITER = {
        log: function() {
            stream.write(util.format.apply(null, arguments));
            stream.write('\n');
        }
    }
}


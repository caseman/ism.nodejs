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
var CONFIG = exports.config = {};

var mkLogger = function(prefix) {
    var logger = function() {
        var dateStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
        var args = [dateStr, prefix].concat(Array.prototype.slice.call(arguments));
        LOG_WRITER.log.apply(LOG_WRITER, args);
    }
    return logger;
}

exports.configure = function(config) {
    log.error = mkLogger('ERROR');
    CONFIG.verbose = config.verbose || config.debug;
    log.info = CONFIG.verbose ? mkLogger('INFO') : nullLogger;
    CONFIG.debug = config.debug;
    log.debug = CONFIG.debug ? mkLogger('DEBUG') : nullLogger;
    if (config.filePath) useFile(config.filePath);
}

exports.defaultClientPath = function() {
    if (process.env.HOME) {
        return path.join(process.env.HOME, '.ism', 'client.log')
    }
}

function useFile(filePath) {
    var dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);

    var stream = fs.createWriteStream(filePath);
    LOG_WRITER = {
        log: function() {
            stream.write(util.format.apply(null, arguments));
            stream.write('\n');
        }
    }
    CONFIG.filePath = filePath;
}
exports.useFile = useFile


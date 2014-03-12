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
    if (config.filePath) {
        var options = config.append ? {flags: 'a'} : undefined;
        CONFIG.append = config.append;
        useFile(config.filePath, options);
    }
}

exports.defaultClientPath = function() {
    if (process.env.HOME) {
        return path.join(process.env.HOME, '.ism', 'client.log')
    }
}

function useFile(filePath, options) {
    var dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);

    var stream = fs.createWriteStream(filePath, options);
    LOG_WRITER = {
        log: function() {
            var out = util.format.apply(null, arguments);
            if (out.length > 500) out = out.slice(0, 500) + ' ...'
            stream.write(out);
            stream.write('\n');
        }
    }
    CONFIG.filePath = filePath;
}
exports.useFile = useFile


var nullLogger = function() {}

var log = {
    debug: nullLogger,
    info: nullLogger,
    error: nullLogger
}
exports.log = log;

exports.useStderr = false;

var mkLogger = function(prefix) {
    var logger = function() {
        var dateStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
        var args = [dateStr, prefix].concat(Array.prototype.slice.call(arguments));
        if (!exports.useStderr) {
            console.log.apply(console, args);
        } else {
            console.error.apply(console, args);
        }
    }
    return logger;
}

exports.configure = function(verbose, debug) {
    log.error = mkLogger('ERROR');
    log.info = verbose ? mkLogger('INFO') : nullLogger;
    log.debug = debug ? mkLogger('DEBUG') : nullLogger;
}

var fs = require('fs')
  , path = require('path')
  , extend = require('extend')

exports.defaultClientPath = function() {
    if (process.env.HOME) {
        return path.join(process.env.HOME, '.ism', 'client-prefs.json')
    }
}

var FILE_PATH = null
  , PREFS = null
  , SAVED = null

exports.defaults = {}

// For testing
exports._reset = function() {
    FILE_PATH = null
    PREFS = null
    SAVED = null
    exports.defaults = {}
    exports._saveCallback = undefined;
}

exports.usePath = function(filePath) {
    FILE_PATH = filePath
    var parentDir = path.dirname(filePath)
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir)
}

exports.path = function() {
    return FILE_PATH
}

function prefs(noCache) {
    if (!PREFS || noCache) {
        if (FILE_PATH && fs.existsSync(FILE_PATH)) {
            PREFS = JSON.parse(fs.readFileSync(FILE_PATH))
        } else {
            return {}
        }
    }
    return PREFS
}

exports.get = function(name, noCache) {
    var value
    if (SAVED) value = SAVED[name]
    if (value === undefined) value = prefs(noCache)[name]
    if (value === undefined) value = exports.defaults[name]
    return value
}

exports.save = function(name, value) {
    if (!SAVED) {
        SAVED = {}
        process.nextTick(function() {
            if (SAVED && FILE_PATH) {
                PREFS = extend(prefs(true), SAVED)
                SAVED = null
                var file = fs.createWriteStream(FILE_PATH)
                file.write(JSON.stringify(PREFS, null, 2), exports._saveCallback)
            }
        })
    }
    if (typeof name === 'string') {
        SAVED[name] = value
    } else if (name && value === undefined) {
        value = name
        if (typeof value.toJSON === 'function') value = value.toJSON()
        for (var key in value) {
            if (value.hasOwnProperty(key)) SAVED[key] = value[key];
        }
   }
}

exports.getAndSave = function(name) {
    var value = exports.get(name, true)
    exports.save(name, value)
    return value
}




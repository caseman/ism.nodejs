var crypto = require('crypto')

exports.genUid = function() {
    return crypto.pseudoRandomBytes(24).toString('base64').replace(/[\/+=]/g, '-')
}


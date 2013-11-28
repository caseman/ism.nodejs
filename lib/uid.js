var crypto = require('crypto');

var uids = {};

exports.genUid = function(callback) {
    crypto.randomBytes(48, function(ex, buf) {
        var uid = buf.toString('hex');
        if (uid in uids) {
            exports.genUid(callback);
        } else {
            uids[uid] = uid;
            callback(uid);
        }
    });
}

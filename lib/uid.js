var uids = {};

exports.genUid = function() {
    var uid = Math.random().toString().substring(2);
    if (uid in uids) {
        return exports.genUid();
    } else {
        uids[uid] = uid;
        return uid;
    }
}

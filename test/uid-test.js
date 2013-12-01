var assert = require('assert');

suite('genUid', function() {
    var genUid = require('../lib/uid').genUid;

    test('uids are sufficiently long', function() {
        var uid = genUid();
        assert(uid.length > 12, 'uid too short');
    });

    test('uids are url safe', function() {
        var uid;
        for (var i = 0; i < 100; i++) {
            uid = genUid();
            assert.equal(uid, encodeURIComponent(uid), 'uid not url-safe');
        }
    });

    test('uids are unique', function() {
        var uids = {};
        for (var i = 0; i < 10000; i++) {
            var uid = genUid();
            assert(uid, 'genUid() generated empty uid');
            assert(!(uid in uids), 'genUid() generated duplicate uid');
        }
    });
});

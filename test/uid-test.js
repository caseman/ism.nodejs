var assert = require('assert');

suite('genUid', function() {
    var genUid = require('../lib/uid').genUid;

    test('uids are sufficiently long', function(done) {
        genUid(function(uid) {
            assert(uid.length > 30, 'uid too short');
            done();
        })
    });

    test('uids are url safe', function(done) {
        var uidUrlSafe = function(remaining) {
            if (remaining > 0) {
                genUid(function(uid) {
                    assert.equal(uid, encodeURIComponent(uid), 'uid not url-safe');
                    uidUrlSafe(--remaining);
                });
            } else {
                done();
            }
        }
        uidUrlSafe(100);
    });

    test('uids are unique', function() {
        var uids = {};
        var uidUnique = function(remaining) {
            if (remaining > 0) {
                genUid(function(uid) {
                    assert(uid, 'genUid() generated empty uid');
                    assert(!(uid in uids), 'genUid() generated duplicate uid');
                    uidUnique(--remaining);
                });
            } else {
                done();
            }
        }
        uidUnique(10000);
    });
});

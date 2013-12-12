var assert = require('assert')
  , path = require('path')
  , fs = require('fs')
  , tmp = require('tmp');

suite('db', function() {
    var db = require('../lib/db');

    test('key with various string parts', function() {
        assert.equal(db.key('somethin'), 'somethin');
        assert.equal(db.key('somethin', 'else'), 'somethin~else');
        assert.equal(db.key('somethin', 'or', 'other'), 'somethin~or~other');
        assert.equal(db.key('some', 100, 'thing'), 'some~100~thing');
    });

    test('key with uid objects', function() {
        var o1 = {uid:'1'}, o2 = {uid:'2'};
        assert.equal(db.key(o1), '1');
        assert.equal(db.key(o1, o2), '1~2');
        assert.equal(db.key('thing', o1, 'and', o2), 'thing~1~and~2');
    });

    test('default path in home dir', function() {
        var dbPath = db.defaultPath();
        assert.equal(dbPath.indexOf(process.env.HOME), 0);
    });

    test('creates subdirectories on open', function(done) {
        tmp.dir({unsafeCleanup: true}, function(err, dirPath) {
            dbPath = path.join(dirPath, 'how', 'now');
            assert(!fs.existsSync(dbPath));
            var testDb = db.open(dbPath, function(err, db) {
                assert(fs.existsSync(dbPath));
                done();
            });
            assert.equal(testDb.location, dbPath);
        });
    });

});


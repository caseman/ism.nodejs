var assert = require('assert');

suite('db key', function() {
    var key = require('../lib/db').key;

    test('key with various string parts', function() {
        assert.equal(key('somethin'), 'somethin');
        assert.equal(key('somethin', 'else'), 'somethin~else');
        assert.equal(key('somethin', 'or', 'other'), 'somethin~or~other');
        assert.equal(key('some', 100, 'thing'), 'some~100~thing');
    });

    test('key with uid objects', function() {
        var o1 = {uid:'1'}, o2 = {uid:'2'};
        assert.equal(key(o1), '1');
        assert.equal(key(o1, o2), '1~2');
        assert.equal(key('thing', o1, 'and', o2), 'thing~1~and~2');
    });

});


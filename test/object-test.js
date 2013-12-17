var assert = require('assert');

suite('object types and events', function() {
    var object = require('../lib/object');

    this.beforeEach(object._clearTypes);
    this.afterEach(object._restoreTypes);

    test('cannot define same type twice', function() {
        object.define('same', {});
        assert.throws(function() {
            object.define('same', {});
        });
    });

    test('create object with type', function() {
        object.define('test', {});
        var obj = object.create('test');
        assert.equal(obj.type, 'test', 'Object should have a type');
        assert(obj.uid, 'Object should have a uid');
    });

    test('create object with properties', function() {
        object.define('test', {});
        var obj = object.create('test', {foo:1, bar:2});
        assert.equal(obj.type, 'test', 'Object should have a type');
        assert.equal(obj.foo, 1);
        assert.equal(obj.bar, 2);
    });

    test('send event to objects', function() {
        object.define('test1', {
            event1: function(val) {
                this.event1 = val;
            },
            event2: function(x, y) {
                this.where = [x, y];
            }
        });
        object.define('test2', {
            event2: function(x, y) {
                this.where = [x + 1, y + 1];
            }
        });
        var objs = [
            object.create('test1'),
            object.create('test2'),
            object.create('test1'),
            object.create('test2')
        ];

        object.sendEvent('event1', objs, 42);
        assert.equal(objs[0].event1, 42);
        assert.equal(objs[1].event1, undefined);
        assert.equal(objs[2].event1, 42);
        assert.equal(objs[3].event1, undefined);

        object.sendEvent('event2', objs, 3, 9);
        assert.deepEqual(objs[0].where, [3, 9]);
        assert.deepEqual(objs[1].where, [4, 10]);
        assert.deepEqual(objs[2].where, [3, 9]);
        assert.deepEqual(objs[3].where, [4, 10]);
    });

    test('Unknown event to objects throws', function() {
        assert.throws(function() {
            object.sendEvent('gawrsh', []);
        });
    });

});

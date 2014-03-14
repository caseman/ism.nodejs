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

    test('create from spec', function() {
        object.define({
            type: 'spectest'
          , properties: {foo: 1}
        });
        var obj1 = object.create('spectest');
        assert.equal(obj1.type, 'spectest', 'Object should have a type');
        assert(obj1.uid, 'Object should have a uid');
        assert.strictEqual(obj1.foo, 1);

        var obj2 = object.create('spectest', { foo:23, bar: 11 });
        assert.equal(obj2.type, 'spectest', 'Object should have a type');
        assert(obj2.uid, 'Object should have a uid');
        assert.strictEqual(obj2.foo, 23);
        assert.strictEqual(obj2.bar, 11);
    });

    test('spec for object', function() {
        var spec = {
            type: 'speccy'
          , properties: {foo: 1}
        };
        object.define(spec);
        var obj = object.create('speccy');
        assert.deepEqual(object.spec(obj), spec);
        assert.deepEqual(object.spec('speccy'), spec);
    });

    test('object with spec isA', function() {
        object.define({ type: 'baz' });
        object.define({ type: 'bar', parentType: 'baz' });
        object.define({ type: 'foo', parentType: 'bar' });
        object.define({ type: 'spam', parentType: 'baz' });
        var foo = object.create('foo');
        assert(object.isA(foo, 'foo'));
        assert(object.isA(foo, 'bar'));
        assert(object.isA(foo, 'baz'));
        assert(!object.isA(foo, 'spam'));
        var bar = object.create('bar');
        assert(!object.isA(bar, 'foo'));
        assert(object.isA(bar, 'bar'));
        assert(object.isA(bar, 'baz'));
        assert(!object.isA(bar, 'spam'));
        var spam = object.create('spam');
        assert(!object.isA(spam, 'foo'));
        assert(!object.isA(spam, 'bar'));
        assert(object.isA(spam, 'baz'));
        assert(object.isA(spam, 'spam'));
    });

    test('isA with recursive spec', function() {
        object.define({ type: 'foo', parentType: 'bar' });
        object.define({ type: 'bar', parentType: 'baz' });
        object.define({ type: 'baz', parentType: 'foo' });
        object.define({ type: 'spam' });
        var foo = object.create('foo');
        assert(object.isA(foo, 'foo'));
        assert(object.isA(foo, 'bar'));
        assert(object.isA(foo, 'baz'));
        assert(!object.isA(foo, 'spam'));
    });

    test('create object with type', function() {
        object.define('test', {});
        var obj = object.create('test');
        assert.equal(obj.type, 'test', 'Object should have a type');
        assert(obj.uid, 'Object should have a uid');
    });

    test('object with type isA', function() {
        object.define('blarg');
        var obj = object.create('blarg');
        assert(object.isA(obj, 'blarg'));
        assert(!object.isA(obj, 'flarg'));
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

    test('inherits handlers from parent type', function() {
        object.define('parent', { pevent: function(val) { this.pevent = val }});
        object.define(
            { type: 'child' , parentType: 'parent' }
          , { cevent: function(val) { this.cevent = val }}
        );
        var obj = object.create('child');
        object.sendEvent('pevent', [obj], 'PARENT!');
        object.sendEvent('cevent', [obj], 'CHILD!');
        assert.strictEqual(obj.pevent, 'PARENT!');
        assert.strictEqual(obj.cevent, 'CHILD!');
     });

    test('default properties for clientCopy', function() {
        object.define('defaultfc', {});
        var obj = object.create('defaultfc', {
            createdTurn: 2
          , modifiedTurn: 5
          , location: [15, 23]
          , flimflam: 100
          , justification: 0
        });
        var copy = object.clientCopy(obj);
        assert.deepEqual(copy, {
            uid: obj.uid
          , type: 'defaultfc'
          , createdTurn: 2
          , modifiedTurn: 5
          , location: [15, 23]
        });
    });

    test('visible properties for clientCopy', function() {
        object.define('visiblefc', {}, {flux:true, crux:true});
        var obj = object.create('visiblefc', {
            createdTurn: 10
          , modifiedTurn: 10
          , flux: 20
          , buzz: 10
        });
        var copy = object.clientCopy(obj);
        assert.deepEqual(copy, {
            uid: obj.uid
          , type: 'visiblefc'
          , createdTurn: 10
          , modifiedTurn: 10
          , flux: 20
        });
        var obj2 = object.create('visiblefc', {
            location: [5, 4]
          , crux: 11
        });
        var copy2 = object.clientCopy(obj2);
        assert.deepEqual(copy2, {
            uid: obj2.uid
          , type: 'visiblefc'
          , location: [5, 4]
          , crux: 11
        });
    });

    test('clientCopy null value', function() {
        assert.strictEqual(object.clientCopy(undefined), null);
    });

});

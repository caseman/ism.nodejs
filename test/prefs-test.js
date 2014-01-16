var assert = require('assert')
  , fs = require('fs')
  , path = require('path')
  , tmp = require('tmp')

tmp.setGracefulCleanup()

suite('prefs', function() {
    var prefs = require('../lib/prefs')

    this.beforeEach(function() {
        prefs._reset()
    })

    test('default client path in home dir', function() {
        var prefsPath = prefs.defaultClientPath()
        assert.equal(prefsPath.indexOf(process.env.HOME), 0)
    })

    test('use defaults without file', function() {
        prefs.defaults = {foo: 'bar'}

        assert.equal(prefs.get('foo'), 'bar')
        assert.strictEqual(prefs.get('baz'), undefined)

        prefs.defaults = {}
    })

    test('creates directory on usePath', function(done) {
        tmp.dir({unsafeCleanup: true}, function(err, dirPath) {
            assert(!err, err)
            var prefsPath = path.join(dirPath, 'myprefs', 'ism.prefs')
            assert(!fs.existsSync(path.dirname(prefsPath)))
            prefs.usePath(prefsPath)
            assert(fs.existsSync(path.dirname(prefsPath)))
            done()
        })
    })

    test('get with no file yet', function(done) {
        tmp.dir({unsafeCleanup: true}, function(err, dirPath) {
            assert(!err, err)
            var prefsPath = path.join(dirPath, 'test.prefs')
            prefs.usePath(prefsPath)
            assert.strictEqual(prefs.get('baz'), undefined)
            assert(!fs.existsSync(prefsPath))
            done()
        })
    })

    test('get reads from file', function(done) {
        tmp.dir({unsafeCleanup: true}, function(err, dirPath) {
            assert(!err, err)
            var prefsPath = path.join(dirPath, 'test.prefs')
              , prefsData = {
                    str: 'Something Something Something'
                  , arr: [1, 2, 3, 'a', 'b']
                  , bool: true
                  , obj: {foo:'bar', baz:'spam'}
                }

            fs.writeFileSync(prefsPath, JSON.stringify(prefsData))
            prefs.usePath(prefsPath)
            assert.deepEqual(prefs.get('str'), prefsData.str)
            assert.deepEqual(prefs.get('arr'), prefsData.arr)
            assert.deepEqual(prefs.get('bool'), prefsData.bool)
            assert.deepEqual(prefs.get('obj'), prefsData.obj)
            assert.strictEqual(prefs.get('nuttin'), undefined)

            prefs.defaults.nuttin = 'sumptin'
            assert.strictEqual(prefs.get('nuttin'), 'sumptin')
            done()
        })
    })

    test('rereads file when noCache specified', function() {
        tmp.dir({unsafeCleanup: true}, function(err, dirPath) {
            assert(!err, err)
            var prefsPath = path.join(dirPath, 'test.json')
            fs.writeFileSync(prefsPath, JSON.stringify({huh: 'what?'}))
            prefs.usePath(prefsPath)
            assert.strictEqual(prefs.get('huh'), 'what?')
            assert.strictEqual(prefs.get('some'), undefined)
            fs.writeFileSync(prefsPath, JSON.stringify({
                huh: 'yeah'
              , some: 'thing'
            }))
            assert.strictEqual(prefs.get('huh'), 'what?')
            assert.strictEqual(prefs.get('some'), undefined)
            assert.strictEqual(prefs.get('huh', true), 'yeah')
            assert.strictEqual(prefs.get('some', true), 'thing')
        })
    })

    test('saves singly to memory without file', function() {
        assert.strictEqual(prefs.get('flavor'), undefined)
        assert.strictEqual(prefs.get('portion'), undefined)
        prefs.save('flavor', 'chicken');
        prefs.save('portion', 1);
        assert.strictEqual(prefs.get('flavor'), 'chicken')
        assert.strictEqual(prefs.get('portion'), 1)
        prefs.save('portion', 3);
        assert.strictEqual(prefs.get('flavor'), 'chicken')
        assert.strictEqual(prefs.get('portion'), 3)
    })

    test('saves singly to file', function(done) {
        tmp.dir({unsafeCleanup: true}, function(err, dirPath) {
            assert(!err, err)
            var prefsPath = path.join(dirPath, 'test.json')
            prefs.usePath(prefsPath)
            assert.strictEqual(prefs.get('flavor'), undefined)
            assert.strictEqual(prefs.get('portion'), undefined)
            prefs.save('flavor', 'chicken');
            prefs.save('portion', 1);
            assert.strictEqual(prefs.get('flavor'), 'chicken')
            assert.strictEqual(prefs.get('portion'), 1)
            prefs.save('portion', 3);
            assert.strictEqual(prefs.get('flavor', true), 'chicken')
            assert.strictEqual(prefs.get('portion', true), 3)

            prefs._saveCallback = function() {
                assert(fs.existsSync(prefsPath))
                var data = require(prefsPath)
                assert.strictEqual(data.flavor, 'chicken')
                assert.strictEqual(data.portion, 3)
                done();
            }
        })
    })

    test('saves multiple values to file', function(done) {
        tmp.dir({unsafeCleanup: true}, function(err, dirPath) {
            assert(!err, err)
            var prefsPath = path.join(dirPath, 'test.json')
            prefs.usePath(prefsPath)
            assert.strictEqual(prefs.get('flavor'), undefined)
            assert.strictEqual(prefs.get('portion'), undefined)

            prefs.save({
                flavor: 'beef'
              , portion: 2
            })
            assert.strictEqual(prefs.get('flavor'), 'beef')
            assert.strictEqual(prefs.get('portion'), 2)
            prefs.save({
                portion: 1
              , doneness: 'medium'
            });
            assert.strictEqual(prefs.get('flavor', true), 'beef')
            assert.strictEqual(prefs.get('portion', true), 1)
            assert.strictEqual(prefs.get('doneness', true), 'medium')

            prefs._saveCallback = function() {
                assert(fs.existsSync(prefsPath))
                var data = require(prefsPath)
                assert.strictEqual(data.flavor, 'beef')
                assert.strictEqual(data.portion, 1)
                assert.strictEqual(data.doneness, 'medium')
                done();
            }
        })
    })

    test('saves multiple values to file', function(done) {
        tmp.dir({unsafeCleanup: true}, function(err, dirPath) {
            assert(!err, err)
            var prefsPath = path.join(dirPath, 'test.json')
            fs.writeFileSync(prefsPath, JSON.stringify({thingies: [1]}))
            prefs.usePath(prefsPath)
            prefs.getAndSave('thingies').push(2)
            prefs.getAndSave('thingies').push(3)

            prefs._saveCallback = function() {
                var data = require(prefsPath)
                assert.deepEqual(data.thingies, [1,2,3])
                done();
            }
        })
    })

})

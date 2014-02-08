var assert = require('chai').assert

suite('string', function() {
    var string = require('../lib/string')

    test('capitalize empty', function() {
        assert.strictEqual(string.capitalize(''), '')
        assert.strictEqual(string.capitalize(null), '')
        assert.strictEqual(string.capitalize(), '')
    })

    test('capitalize', function() {
        assert.strictEqual(string.capitalize('hi'), 'Hi')
        assert.strictEqual(string.capitalize('YEAH'), 'Yeah')
        assert.strictEqual(string.capitalize('hi moM'), 'Hi mom')
    })

    test('capitalize trims', function() {
        assert.strictEqual(string.capitalize('  hi '), 'Hi')
    })

    test('capWords empty', function() {
        assert.strictEqual(string.capWords(''), '')
        assert.strictEqual(string.capWords(null), '')
        assert.strictEqual(string.capWords(), '')
    })

    test('capWords', function() {
        assert.strictEqual(string.capWords('hello there'), 'Hello There')
        assert.strictEqual(string.capWords('hello THERE'), 'Hello There')
        assert.strictEqual(string.capWords('HEELO'), 'Heelo')
    })

    test('capWords trims', function() {
        assert.strictEqual(string.capWords('  there is a house  '), 'There Is A House')
    })

    test('capWords collapses spaces', function() {
        assert.strictEqual(string.capWords('is  it ME  you\'re looking    for? '),
          'Is It Me You\'re Looking For?')
    })
})

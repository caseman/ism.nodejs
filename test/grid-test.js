var assert = require('assert');

suite('visitRangeBounds', function() {
    var visitRangeBounds = require('../lib/grid').visitRangeBounds;

    var rangeBounds = function(cx, cy, r) {
        var ring = [];
        visitRangeBounds(cx, cy, r, function(x, y) { ring.push([x, y]); });
        return ring;
    }

    test('range 1', function() {
        assert.deepEqual(rangeBounds(0, 0, 1), 
            [[-1,-1], [0,-1], [1,-1], [1,0], [1,1], [0,1], [-1,1], [-1,0]]);
        assert.deepEqual(rangeBounds(1, 1, 1),
            [[0,0], [1,0], [2,0], [2,1], [2,2], [1,2], [0,2], [0,1]]);
        assert.deepEqual(rangeBounds(45, 21, 1),
            [[44,20], [45,20], [46,20], [46,21], [46,22], [45,22], [44,22], [44,21]]);
    });

    test('range 2', function() {
        assert.deepEqual(rangeBounds(5, 7, 2),
            [[3,5], [4,5], [5,5], [6,5], [7,5], 
             [7,6], [7,7], [7,8], [7,9],
             [6,9], [5,9], [4,9], [3,9],
             [3,8], [3,7], [3,6]]
        );
    });

    test('range 3', function() {
        assert.deepEqual(rangeBounds(3, 7, 3),
            [[0,4], [1,4], [2,4], [3,4], [4,4], [5,4], [6,4],
             [6,5], [6,6], [6,7], [6,8], [6,9], [6,10],
             [5,10], [4,10], [3,10], [2,10], [1,10], [0,10],
             [0,9], [0,8], [0,7], [0,6], [0,5]]
        );
    });

});

suite('visitRayTrace', function() {
    var visitRayTrace = require('../lib/grid').visitRayTrace;

    var rayTrace = function(x0, y0, x1, y1, count) {
        var ray = [];
        visitRayTrace(x0, y0, x1, y1, function(x, y) {
            ray.push([x, y]);
            return count === undefined || --count > 0;
        });
        return ray;
    }

    test('horizontal', function() {
        assert.deepEqual(rayTrace(5, 3, 11, 3),
          [[5,3], [6,3], [7,3], [8,3], [9,3], [10,3], [11,3]]);
        assert.deepEqual(rayTrace(11, 3, 5, 3),
          [[11,3], [10,3], [9,3], [8,3], [7,3], [6,3], [5,3]]);
        assert.deepEqual(rayTrace(-2, 0, 2, 0),
          [[-2,0], [-1,0], [0,0], [1,0], [2,0]]); 
    });

    test('horizontal aborted', function() {
        assert.deepEqual(rayTrace(2, 1, 9, 1, 4),
          [[2,1], [3,1], [4,1], [5,1]]);
        assert.deepEqual(rayTrace(9, 1, 4, 1, 3),
          [[9,1], [8,1], [7,1]]);
        assert.deepEqual(rayTrace(0, 1, 0, -2),
          [[0,1], [0,0], [0,-1], [0,-2]]); 
    });

    test('vertical', function() {
        assert.deepEqual(rayTrace(2, 2, 2, 7),
          [[2,2], [2,3], [2,4], [2,5], [2,6], [2,7]]);
        assert.deepEqual(rayTrace(2, 7, 2, 2),
          [[2,7], [2,6], [2,5], [2,4], [2,3], [2,2]]);
    });

    test('vertical aborted', function() {
        assert.deepEqual(rayTrace(5, 3, 5, 11, 5),
          [[5,3], [5,4], [5,5], [5,6], [5,7]]);
        assert.deepEqual(rayTrace(3, 9, 3, 1, 2),
          [[3,9], [3,8]]);
    });

    test('unitary', function() {
        assert.deepEqual(rayTrace(9, 9, 9, 9), [[9,9]]);
        assert.deepEqual(rayTrace(1,2,1,2), [[1,2]]);
    });

    test('diagonals', function() {
        assert.deepEqual(rayTrace(0, 0, 4, 4),
          [[0,0],[0,1],[1,1],[1,2],[2,2],[2,3],[3,3],[3,4],[4,4]]);
        assert.deepEqual(rayTrace(3, 3, 6, 0),
          [[3,3],[3,2],[4,2],[4,1],[5,1],[5,0],[6,0]]);
        assert.deepEqual(rayTrace(0, 2, 5, 0),
          [[0,2], [1,2], [1,1], [2,1], [3,1], [4,1], [4,0], [5,0]]);
        assert.deepEqual(rayTrace(2, 3, 0, 0),
          [[2,3], [2,2], [1,2], [1,1], [0,1], [0,0]]);
        assert.deepEqual(rayTrace(0, -2, -1, 2),
          [[0,-2], [0,-1], [0,0], [-1,0], [-1,1], [-1,2]]);
    });

});


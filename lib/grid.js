
function visitRayTrace(x0, y0, x1, y1, visitFunc) {
    var 
      dx = Math.abs(x1 - x0)
    , dy = Math.abs(y1 - y0)
    , x = x0
    , y = y0
    , n = 1 + dx + dy
    , x_inc = (x1 > x0) ? 1 : -1
    , y_inc = (y1 > y0) ? 1 : -1
    , error = dx - dy;
    dx *= 2;
    dy *= 2;

    for (; n > 0; --n) {
        if (!visitFunc(x, y)) break;

        if (error > 0) {
            x += x_inc;
            error -= dy;
        } else {
            y += y_inc;
            error += dx;
        }
    }
}
exports.visitRayTrace = visitRayTrace;

function visitRangeBounds(centerX, centerY, radius, visitFunc) {
    // radius 0 is not supported right now because yagni
    var x = centerX - radius, y = centerY - radius;
    for (; x < centerX + radius; x++) visitFunc(x, y);
    for (; y < centerY + radius; y++) visitFunc(x, y);
    for (; x > centerX - radius; x--) visitFunc(x, y);
    for (; y > centerY - radius; y--) visitFunc(x, y);
}
exports.visitRangeBounds = visitRangeBounds;

function visitRandomWalk(x, y, maxVisits, visitFunc) {
    var key, visited = {};
    if (!visitFunc) {
        visitFunc = maxVisits;
        maxVisits = -1;
    }
    while (true) {
        key = x + ',' + y;
        if (!visited[key]) {
            if (!visitFunc(x, y) || --maxVisits == 0) return;
            visited[key] = true;
        }
        x += Math.round(Math.random() * 2 - 1);
        y += Math.round(Math.random() * 2 - 1);
    }
}
exports.visitRandomWalk = visitRandomWalk;



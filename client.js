var charm = require('charm')()
charm.pipe(process.stdout)

var xmax = process.stdout.columns || 80
, ymax = process.stdout.rows || 20
, viewporty = ymax - 3
, viewportx = xmax - 3

var debug = function(){
  charm.position(0, ymax -1).write(Array.prototype.slice.call(arguments, 0).join(', '))
}


var CURSOR = 'red' // 13
var TILES = {
  SNOW : 15

, DEEP_SEA : 18
, COASTAL_SEA : 20
, RIVER : 21

, FOREST : 28
, RAINFOREST : 35
, GRASS : 40

, MOUNTAIN : 139

, DESERT : 179
}



var MAP = []

var loadMap = function(cb){
  // TESTMAP
  for (var y = 0; y < (ymax + 10); y++){
    var row = []
    for (var x =0; x< (xmax + 10); x++){
      row.push(Object.keys(TILES)[parseInt(Math.random() * Object.keys(TILES).length)])
    }
    MAP.push(row)
  }
  cb()
}


var objects = {
  warrior: 'w'
}



/*
charm.position(0, 0)
for (var i=0; i<256; i++){
  charm.background(i).write('' + i)
  charm.background(0).write(' ')
}
*/

var renderMap = function(){
  for (var y = 0; y<viewporty; y++){
    charm.position(0,y+1)
    for (var x = 0; x<viewportx; x++){
      var pos = MAP[y][x]
      charm.background(TILES[pos]).write(' ')
    }
  }
}


var _CURSOR_POS = [0, 0]
var renderCursor = function(pos, cb){
  cb = cb || function(){}
  if (!pos)
    return cb(null, _CURSOR_POS);

  charm.position(_CURSOR_POS[1], _CURSOR_POS[0])
  charm.background(TILES[MAP[_CURSOR_POS[0]][_CURSOR_POS[1]]]).write('/') // TODO tiledata
  _CURSOR_POS = pos
  charm.position(_CURSOR_POS[1], _CURSOR_POS[0])
  charm.background(CURSOR).write('X')

  debug("CURSOR:", _CURSOR_POS)

  return cb(null, pos)
}

var moveCursor = function(diff, cb){
  var curs = _CURSOR_POS
    , pos = []
  pos[0] = Math.min(Math.max(curs[0] + diff[0], 0), viewporty)
  pos[1] = Math.min(Math.max(curs[1] + diff[1], 0), viewportx)
  // TODO -- Handle viewport moving
  renderCursor(pos, cb)
}



var render = function(){
  renderMap()
  renderCursor([0,0])
}


loadMap(render)



/// ==== Keys ===


keyHandlers = {
  up : function(){moveCursor([-1, 0])}
, down : function(){moveCursor([1, 0])}
, left : function(){moveCursor([0, -1])}
, right : function(){moveCursor([0, 1])}
}


var handleKey = function(key){
  if (keyHandlers[key.name])
    keyHandlers[key.name]()
}

var keypress = require('keypress')
  , tty = require('tty');

keypress(process.stdin);

process.stdin.on('keypress', function (ch, key) {
  if (key && key.ctrl && key.name == 'c') {
    process.stdin.pause();
  }
  handleKey(key, ch);
});

if (typeof process.stdin.setRawMode == 'function') {
  process.stdin.setRawMode(true);
} else {
  tty.setRawMode(true);
}

process.stdin.resume();





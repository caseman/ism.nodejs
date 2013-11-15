var charm = require('charm')()
charm.pipe(process.stdout)

var xmax = process.stdout.columns || 80
, ymax = process.stdout.rows || 20



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
  for (var y = 0; y<ymax; y++){
    charm.position(0,y+1)
    for (var x = 0; x<xmax; x++){
      var pos = MAP[y][x]
      charm.background(TILES[pos]).write(' ')
    }
  }
}


var renderCursor = (function(){
  var _CURSOR_POS = [0, 0]

  return function(pos, cb){
    cb = cb || function(){}
    if (!pos)
      return cb(null, _CURSOR_POS);

    charm.position(_CURSOR_POS[0], _CURSOR_POS[1])
    charm.background(TILES[MAP[_CURSOR_POS[0]][_CURSOR_POS[1]]]).write(' ') // TODO tiledata
    _CURSOR_POS = pos
    charm.position(_CURSOR_POS[0], _CURSOR_POS[1])
    charm.background(CURSOR).write('X')

    return cb(null, pos)
  }
})()


var render = function(){
  renderMap()
  renderCursor([0,0])
  setTimeout(render, 1000)
}


loadMap(render)

process.stdin.on('data', function(chunk){
  console.log("!!", chunk)


})
process.stdin.resume();
process.stdin.setEncoding('utf8');


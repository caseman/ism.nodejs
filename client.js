var charm = require('charm')()
charm.pipe(process.stdout)

var xmax = process.stdout.columns || 80 // Physical 'screen' size'
  , ymax = process.stdout.rows || 20

  , status_bar = 3
  , side_pane = 5
  , viewporty = ymax - status_bar // viewport is most of screen, minus bottom status area and x pane
  , viewportx = xmax - side_pane

var _CURSOR_POS = [0, 0] // Y, X --> MAP position
  , _VIEWPORT_OFFSET = [0, 0] // Y, X --> Viewport offset into map
  , TILES = require('./tiles')
  , OBJECTS = require('./objects')

var MAP = []

var debug = function(){
  charm.position(0, ymax).write(Array.prototype.slice.call(arguments, 0).join(', '))
}


var loadMap = function(cb){
  var _test_map = require('./data/testmap.json')
  MAP = _test_map
  cb()
}

var renderMap = function(){
  // ! no error checking for viewport in here...
  var offset = _VIEWPORT_OFFSET

  for (var y = 0; y<viewporty; y++){
    charm.position(0,y)
    for (var x = 0; x<viewportx; x++){

      var pos = [offset[0] + y, offset[1] + x]
        , tile = MAP[pos[0]][pos[1]]

      if (! TILES[tile]) throw "No terrain color for: " + pos
      charm.background(TILES[tile]).write(' ') // TODO -> Lookup objects too
    }
  }
}

var moveViewport = function(diff){
  var oldOffset = _VIEWPORT_OFFSET
    , newOffset = [oldOffset[0] + diff[0], oldOffset[1] + diff[1]]

  // Doesn't push viewport off map?
  if (newOffset[0] < 0 || newOffset[1] < 0){
    return;
  }
  if ((newOffset[0] + viewporty >= MAP.length) || (newOffset[1] + viewportx >= MAP[0].length)){
    return;
  }

  // Shift and reRender
  _VIEWPORT_OFFSET = newOffset
  render()
}

var mapToViewport = function(pos){
  return [pos[0] - _VIEWPORT_OFFSET[0], pos[1] - _VIEWPORT_OFFSET[1]]
}

var renderCursor = function(pos, cb){
  cb = cb || function(){}
  if (!pos)
    return cb(null, _CURSOR_POS);

  var viewport_curs = mapToViewport(_CURSOR_POS)
  charm.position(viewport_curs[1], viewport_curs[0])
  charm.background(TILES[MAP[_CURSOR_POS[0]][_CURSOR_POS[1]]]).write(' ') // TODO tiledata
  _CURSOR_POS = pos
  viewport_curs = mapToViewport(_CURSOR_POS)
  charm.position(viewport_curs[1], viewport_curs[0])
  charm.background(TILES['cursor']).write('X')

  debug("CURSOR:", _CURSOR_POS, " --> ", MAP[pos[0]][pos[1]])

  return cb(null, pos)
}

var moveCursor = function(diff, cb){
  var curs = _CURSOR_POS
    , pos = []
  pos[0] = Math.max(curs[0] + diff[0], 0)
  pos[1] = Math.max(curs[1] + diff[1], 0)
  var viewport_curs = mapToViewport(pos)
  // Check on map : TODO

  renderCursor(pos, cb)

  // Handle viewport move?
  if (viewport_curs[0] < 3)
    moveViewport([-3, 0])
  if(viewport_curs[0] > viewporty - 3)
    moveViewport([3, 0])
  if (viewport_curs[1] < 3)
    moveViewport([0, -3])
  if(viewport_curs[1] > viewportx - 3)
    moveViewport([0, 3])

}



var render = function(){
  renderMap()
  renderCursor(_CURSOR_POS)
}

charm.reset()
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





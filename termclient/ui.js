/*
 * Various mixed blessings
 */
var blessed = require('blessed')
  , util = require('util')
  , strHash = require('string-hash')
  , log = require('../lib/logging').log
  , screen
  , willRender = false;

/*
 * Initialize blessed screen
 */
exports.initScreen = function initScreen(options) {
    screen = exports.screen = blessed.screen(options);
    if (process.platform == 'darwin') {
        // MacOS terminfo only reports support for 8 colors for some reason
        // Setting this manually will enable blessed to use all available colors
        screen.tput.colors = 256;
    }
}

/*
 * Render ui at next tick
 */
function render() {
    if (!willRender) {
        willRender = true;
        process.nextTick(function() {
            screen.render();
            willRender = false;
        });
    }
}
exports.render = render;

/*
 * Create a view from a local module
 */
exports.show = function show(viewName) {
    var viewCtor = require('./' + viewName);

    return function() {
        return viewCtor.apply(null, arguments);
    }
}

function combine() {
    var result = {};
    for (var i in arguments) {
        var arg = arguments[i];
        for (var name in arg) {
            var val = arg[name];
            if (typeof val == 'object' && name != 'parent') {
                val = combine(result[name] || {}, val);
            }
            result[name] = val;
        }
    }
    return result;
}
exports.combine = combine;

var buttonOptions = {
    mouse: true
  , keys: true
  , padding: {left:1, right:1}
  , align: 'center'
  , style: {
        bg: 31
      , focus: {bg: 6}
      , hover: {bg: 6}
    }
};

function button(options, pressCb) {
    var button = blessed.button(combine(buttonOptions, options));
    button.on('press', pressCb);
    if (button.parent === screen) render();
    return button;
}
exports.button = button;

var dialogOptions = {
    keys: true
  , vi: true
  , top: 'center'
  , left: 'center'
  , width: 'shrink'
  , height: 7
  , padding: {left:2, right:1}
  , border: {type:'line', bg:17}
  , style: {bg: 17, label: {bg: 17}}
};

function dialog(options, buttons, cb) {
    var dialog = blessed.form(combine(dialogOptions, options));
    dialog.data.isDialog = true;

    var done = function(data) {
        if (cb(data) || !data) {
            dialog.detach();
            render();
        }
    }
    dialog.on('submit', done);
    dialog.key('escape', done);

    var dialogBttnOptions = {
        parent: dialog
      , top: dialog.height - 2
      , left: 3
      , height: 1
      , width: 16
    }
    var i = 1;
    var bttnCb = function() {
        if (!this.data.isCancel) {
            dialog.submit();
        } else {
            done();
        }
    }
    buttons.forEach(function(name) {
        dialogBttnOptions.name = dialogBttnOptions.content = name;
        var bttn = button(dialogBttnOptions, bttnCb);
        dialogBttnOptions.left += bttn.width + 3;
        bttn.data.isCancel = (i++ == buttons.length);
    });

    if (dialog.detached) screen.append(dialog);
    dialog.focus();
    render();
    return dialog;
}
exports.dialog = dialog;

var inputOptions = {
    inputOnFocus: true
  , height: 1
  , fg: 'white'
  , bg: 'black'
}

function labeledInput(options, defaultValue) {
    var placement = {
        left: options.name.length + 4
      , right: 3
    };
    var input = blessed.textbox(combine(inputOptions, placement, options));
    if (defaultValue) input.setValue(defaultValue);
    input.key('enter', function() {input.parent.focusNext()});

    var textOptions = {
        parent: input
      , width: 'shrink'
      , top: 0
      , left: -input.name.length - 1
      , content: input.name
    }
    if (input.parent) textOptions.style = combine(input.parent.style);
    var label = blessed.text(textOptions);
    label.on('mousedown', input.focus.bind(input));

    return input;
}
exports.labeledInput = labeledInput;

var TILESPEC = require('./tilespec.json');

function map(options) {
    if (!(this instanceof map)) return new map(options);
    var self = this;
    blessed.box.call(this, options);
    this.xOffset = options.xOffset || 0;
    this.yOffset = options.yOffset || 0;
    this.scrollSpeed = options.scrollSpeed || 1;
    this.game = null;

    if (options.keys && !options.ignoreKeys) {
        this.on('keypress', function(ch, key) {
            var dx = 0
              , dy = 0
              , vi = options.vi && (key.ctrl || key.shift);
            dy -= key.name === 'up'
            dy -= vi && (key.name === 'k' || key.name === 'y' || key.name === 'u')
            dy += key.name === 'down' || key.name === 'linefeed'
            dy += vi && (key.name === 'j' || key.name === 'b' || key.name === 'n')

            dx -= key.name === 'left' || key.name === 'backspace'
            dx -= vi && (key.name === 'h' || key.name === 'y' || key.name === 'b')
            dx += key.name === 'right' 
            dx += vi && (key.name === 'l' || key.name === 'n' || key.name === 'u')

            if (dx || dy) {
                if (key.shift) {
                    var xSpeed = Math.floor(self.width / 3)
                      , ySpeed = Math.floor(self.height / 3);
                    self.scroll(dx * xSpeed, dy * ySpeed);
                } else {
                    var scrollSpeed = self.scrollSpeed
                    self.scroll(dx * scrollSpeed, dy * scrollSpeed);
                }
                self.screen.render();
            }
        });
    }

}
util.inherits(map, blessed.box);

map.prototype.render = function() {
    this._emit('prerender');

    var coords = this._getCoords(true);
    if (!coords) return;
    this.lpos = coords; // Needed for mouse support
    if (!this.game) return coords;

    var lines = this.screen.lines
      , mapWidth = this.game.info.mapWidth
      , xi = coords.xi
      , xl = coords.xl
      , yi = coords.yi
      , yl = coords.yl
      , x, y
      , tx, ty
      , cell
      , tile
      , fg, bg
      , ch
      , attr
      , tilespec;

    var unexploredChars = '⠀⠊⠐⢀⠕⠢⡈⠡⢂⢁⢄⠑⠪⢌⠢⢔'
        unexploredBg = [250,252,251,250,251]
        unexploredFg = [249,248,249,249,250]
      , unexploredTile = function(x, y) {
          var hash = strHash(x + ',' + y);
          return [unexploredBg[hash % 5],
                  unexploredChars[hash % unexploredChars.length],
                  unexploredFg[hash % 5]];
        }

    for (y = yi, ty = this.yOffset; y < yl; y++, ty++) {
        if (!lines[y]) break;
        for (x = xi, tx = this.xOffset; x < xl; x++, tx++) {
            cell = lines[y][x];
            if (!cell) break;

            tile = this.game.tile((tx + mapWidth) % mapWidth, ty);
            if (tile) {
                tilespec = TILESPEC[tile.type] || 
                           TILESPEC[tile.biome] || 
                           TILESPEC[tile.terrain] || 
                           [0, '?', 1];
            } else {
                tilespec = unexploredTile(tx, ty);
            }
            ch = tilespec[1];
            fg = tilespec[2];
            bg = tilespec[0];

            if (tile && tile.objects[0] && tile.objects[0].type == 'person') {
                ch = '@';
                fg = 0;
            }

            attr = this.sattr({}, fg, bg);
            if (attr !== cell[0] || ch !== cell[1]) {
                cell[0] = attr;
                cell[1] = ch;
                lines[y].dirty = true;
            }
        }
    }

    this.children.forEach(function(el) {
        if (el.screen._ci !== -1) {
          el.index = el.screen._ci++;
        }
        el.render();
    });

    this._emit('render', [coords]);

    return coords;
}

/*
 * Scroll the map a relative amount
 */
map.prototype.scroll = function(dx, dy) {
    this.scrollTo(this.xOffset + dx, this.yOffset + dy);
}

/*
 * Scroll to an absolute position, or as close a possible to it
 */
map.prototype.scrollTo = function(xOffset, yOffset) {
    var width = this.game.info.mapWidth
      , height = this.game.info.mapHeight;
    while (xOffset < 0) xOffset += width;
    while (xOffset >= width) xOffset -= width;
    if (yOffset < 0) yOffset = 0;
    if (yOffset + this.height > height) {
        yOffset = height - this.height;
        if (yOffset < 0) yOffset = Math.floor(yOffset / 2);
    }
    this.xOffset = xOffset;
    this.yOffset = yOffset;
}

/*
 * Return the tile at the element position specified if any
 */
map.prototype.tileAt = function(x, y) {
    var tx = x + this.xOffset
      , ty = y + this.yOffset
      , mapWidth = this.game.info.mapWidth;
    return this.game.tile((tx + mapWidth) % mapWidth, ty); 
}

/*
 * Scroll attempting to center the tile position
 */
map.prototype.scrollCentering = function(tileX, tileY) {
    this.scrollTo(
        tileX - Math.floor(this.width / 2)
      , tileY - Math.floor(this.height / 2)
    );
}

/*
 * Scroll the minimum amount to reveal the tile position It will be positioned
 * at least scrollSpeed from the edge of the map view if possible. If it is
 * already visible with enough room to the view edge, no scrolling occurs,
 * and false is returned.
 */
map.prototype.scrollRevealing = function(tileX, tileY) {
    tLeft = this.xOffset + this.scrollSpeed;
    tRight = this.xOffset + this.width - this.scrollSpeed;
    while (tRight <= tLeft) {
        // Handle narrow view
        tLeft--;
        tRight++;
    }
    tTop = this.yOffset + this.scrollSpeed;
    tBottom = this.yOffset + this.height - this.scrollSpeed;
    while (tBottom <= tTop) {
        // Handle short view
        tTop--;
        tBottom++;
    }

    var xOffset = 0
      , yOffset = 0;

    if (tileX < tLeft) {
        xOffset = tileX - tLeft;
    } else if (tileX > tRight) {
        xOffset = tileX - tRight;
    }

    if (tileY < tTop) {
        yOffset = tileY - tTop;
    } else if (tileY > tBottom) {
        yOffset = tileY - tBottom;
    }

    if (xOffset || yOffset) {
        this.scroll(xOffset, yOffset);
        return true;
    } else {
        return false;
    }
}

exports.map = map;

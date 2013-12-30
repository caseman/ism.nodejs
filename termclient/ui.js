/*
 * Various mixed blessings
 */
var blessed = require('blessed')
  , screen
  , willRender = false;

/*
 * Initialize blessed screen
 */
exports.initScreen = function initScreen(options) {
    screen = exports.screen = blessed.screen(options);
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

function combine() {
    var result = {};
    for (var i in arguments) {
        var arg = arguments[i];
        for (var name in arg) {
            result[name] = arg[name];
        }
    }
    return result;
}

var buttonOptions = {
    mouse: true
  , keys: true
  , padding: {left:1, right:1}
  , align: 'center'
  , style: {
        bg: 7
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
  , bg: 'black'
  , border: {type:'line', bg:0}
};

function dialog(options, buttons, cb) {
    var dialog = blessed.form(combine(dialogOptions, options));
    dialog.data.isDialog = true;

    var done = function(data) {
        dialog.detach();
        render();
        cb(data);
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

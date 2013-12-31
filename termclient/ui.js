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



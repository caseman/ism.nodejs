var blessed = require('blessed')
  , ui = require('./ui');

module.exports = function ConnectDialog(options, errorMsg, cb) {
    var msgBox, hostInput, portInput
      , dialog = ui.dialog({
          label: ' Connect to Ism Server '
        , height: 9
        }
      , ['Connect', 'Cancel']
      , function(data) {
            if (data && data.Connect) {
                if (!data.host) {
                    msgBox.style.fg = 'red';
                    msgBox.content = 'Host not specified.';
                    hostInput.focus();
                } else if (!data.port) {
                    msgBox.style.fg = 'red';
                    msgBox.content = 'Port not specified.';
                    portInput.focus();
                } else {
                    options.host = data.host;
                    options.port = data.port;
                    cb(true);
                    return true;
                }
                ui.render();
            } else {
                cb(false);
                return true;
            }
        }
    );

    hostInput = ui.labeledInput({
          parent: dialog
        , top: 2
        , name: 'host'
        }
      , options.host || '');

    portInput = ui.labeledInput({
          parent: dialog
        , top: 4
        , name: 'port'
      }, options.port || '5557');

    msgBox = blessed.text({
        parent: dialog
      , top: dialog.height - 3
      , style: ui.combine(dialog.style)
      , align: 'right'
      , valign: 'bottom'
      , right: 3
      , width: dialog.width - 42
      , height: 2
      , content: errorMsg
    });

    ui.render();
    hostInput.focus();

    return dialog;
}

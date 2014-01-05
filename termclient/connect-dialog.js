var blessed = require('blessed')
  , ui = require('./ui');

module.exports = function ConnectDialog(options, cb) {
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
                    options.serverHost = data.host;
                    options.serverPort = data.port;
                    cb(true);
                    return true;
                }
                msgBox.render();
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
      , options.serverHost || '127.0.0.1');

    portInput = ui.labeledInput({
          parent: dialog
        , top: 4
        , name: 'port'
      }, options.serverPort || '5557');

    msgBox = blessed.text({
        parent: dialog
      , top: dialog.height - 2
      , style: ui.combine(dialog.style)
      , align: 'right'
      , right: 3
      , width: 20
      , height: 1
      , content: options.connectMsg
    });

    dialog.render();
    hostInput.focus();

    return dialog;
}

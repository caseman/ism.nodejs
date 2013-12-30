var blessed = require('blessed');

module.exports = function ConnectDialog(options, cb) {
    var dialog = blessed.form({
        keys: true
      , vi: true
      , top: 'center'
      , left: 'center'
      , width: 60
      , height: 9
      , label: ' Connect to Server '
      , bg: 'black'
      , border: {type:'line', bg:0}
    });

    var close = function(result) {
        dialog.detach();
        dialog.screen.render();
        if (result) {
            options.serverPort = 5557;
            options.serverHost = '127.0.0.1';
        }
        cb(result);
    }

    dialog.on('reset', function() {close(false)});
    dialog.key('escape', function() {close(false)});

    dialog.on('submit', function(data) {console.log(data); close(true)});
    dialog.key('enter', function() {close(true)});

    var okButton = blessed.button({
      parent: dialog,
      mouse: true,
      keys: true,
      shrink: true,
      padding: {
        left: 1,
        right: 1
      },
      left: 10,
      top: 7,
      width: 16,
      name: 'OK',
      content: 'OK',
      align: 'center',
      style: {
        bg: 18,
        focus: {
          bg: 12
        },
        hover: {
          bg: 12
        }
      }
    });
    okButton.on('press', dialog.submit.bind(dialog));

    var cancelButton = blessed.button({
      parent: dialog,
      mouse: true,
      keys: true,
      shrink: true,
      padding: {
        left: 1,
        right: 1
      },
      left: 28,
      top: 7,
      width: 16,
      name: 'Cancel',
      content: 'Cancel',
      align: 'center',
      style: {
        bg: 18,
        focus: {
          bg: 12
        },
        hover: {
          bg: 12
        }
      }
    });
    cancelButton.on('press', dialog.submit.bind(dialog));

    return dialog;
}

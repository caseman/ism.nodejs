var blessed = require('blessed')
  , ui = require('./ui');

module.exports = function MainView() {
    var view = blessed.box({
        parent: ui.screen
      , width: '100%'
      , height: '100%'
    });
/*
    ui.screen.on('resize', function() {
        view.width = ui.screen.width;
        view.height = ui.screen.height;
        ui.render();
    });
*/
    var sidePanel = view.data.sidePanel = blessed.box({
        parent: view
      , width: 40
      , height: '100%'
      , right: 0
      , style: {
            bg: 'blue'
          , fg: 'white'
        }
    });

    var statusBar = view.data.statusBar = blessed.box({
        parent: view
      , right: sidePanel.width
      , height: 1
      , bottom: 0
      , style: {
            bg: 3
          , fg: 'black'
        }
    });

    return view;
}

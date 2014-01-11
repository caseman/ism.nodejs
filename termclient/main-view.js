var blessed = require('blessed')
  , ui = require('./ui');

module.exports = function MainView() {
    var view = blessed.box({
        parent: ui.screen
      , width: '100%'
      , height: '100%'
    });

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

    var mapView = view.data.mapView = ui.map({
        parent: view
      , right: sidePanel.width
      , bottom: statusBar.height
      , scrollSpeed: 4
      , keys: true
      , vi: true
      , mouse: true
    });

    view.on('useClient', function(client) {
        client.on('updatePerson', ui.render);
        client.on('updateGame', ui.render);
        client.on('updateNation', ui.render);
        client.on('joinGame', function(game) {
            mapView.game = game;
            var location = game.nation.startLocation;
            mapView.scrollCentering(location[0], location[1]);
            mapView.focus();
            ui.render();
        });
    });

    return view;
}

var blessed = require('blessed')
  , ui = require('./ui');

module.exports = function MainView() {
    var views = {};

    views.main = blessed.box({
        width: '100%'
      , height: '100%'
      , keys: true
    });

    views.sidePanel = blessed.box({
        parent: views.main
      , width: 30
      , height: '100%'
      , right: 0
      , style: {
            bg: 'blue'
          , fg: 'white'
        }
    });

    views.statusBar = blessed.box({
        parent: views.main
      , right: views.sidePanel.width
      , height: 1
      , bottom: 0
      , style: {
            bg: 3
          , fg: 'black'
        }
    });

    views.statusText = blessed.text({
        parent: views.statusBar
      , left: 1
      , right: 30
      , height: 1
      , style: views.statusBar.style
    });

    views.timeText = blessed.text({
        parent: views.statusBar
      , right: 10
      , height: 1
      , style: views.statusBar.style
    });

    views.map = ui.map({
        parent: views.main
      , right: views.sidePanel.width
      , bottom: views.statusBar.height
      , scrollSpeed: 4
      , keys: true
      , vi: true
      , mouse: true
    });

    return views;
}

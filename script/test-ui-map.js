var fs = require('fs')
  , map = require('../lib/map')
  , ui = require('../termclient/ui');

ui.initScreen({log: 'ui.log'});
ui.screen.key(['escape', 'C-c'], process.exit);

map.readMapFromStream(
    fs.createReadStream('test.map')
  , function(map) {
        var uiMap = ui.map({
              parent: ui.screen
            , width: ui.screen.width
            , height: ui.screen.height
            , xOffset: 200
            , yOffset: 200
            }
          , map.tiles);
        ui.screen.append(uiMap);
        ui.render();
    }
);



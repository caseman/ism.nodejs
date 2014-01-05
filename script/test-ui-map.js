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
            , name: 'testmap'
            , keys: true
            , vi: true
            , scrollSpeed: 4
            , mouse: true
            , width: ui.screen.width
            , height: ui.screen.height
            , xOffset: 200
            , yOffset: 200
            }
          , map
          , map.tiles);

        uiMap.on('click', function(event) {
            uiMap.scrollCentering(event.x + uiMap.xOffset, event.y + uiMap.yOffset);
            ui.render();
        });

        uiMap.on('keypress', function(ch) {
            var scrolled = false;
            if (ch == '7') {
                scrolled = uiMap.scrollRevealing(128, 128);
            }
            if (ch == '8') {
                scrolled = uiMap.scrollRevealing(256, 128);
            }
            if (ch == '9') {
                scrolled = uiMap.scrollRevealing(384, 128);
            }
            if (ch == '4') {
                scrolled = uiMap.scrollRevealing(128, 256);
            }
            if (ch == '5') {
                scrolled = uiMap.scrollRevealing(256, 256);
            }
            if (ch == '6') {
                scrolled = uiMap.scrollRevealing(384, 256);
            }
            if (ch == '1') {
                scrolled = uiMap.scrollRevealing(128, 384);
            }
            if (ch == '2') {
                scrolled = uiMap.scrollRevealing(256, 384);
            }
            if (ch == '3') {
                scrolled = uiMap.scrollRevealing(384, 384);
            }
            if (ch == '0') {
                scrolled = uiMap.scrollRevealing(0, 0);
            }
            if (ch == '.') {
                scrolled = uiMap.scrollRevealing(512, 512);
            }
            if (scrolled) ui.render();
        });

        uiMap.focus();
        ui.render();
    }
);



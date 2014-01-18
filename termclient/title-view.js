var blessed = require('blessed')
  , fs = require('fs')
  , path = require('path')
  , ui = require('./ui')
  , version = require('../package.json').version;

module.exports = function TitleView() {
    var views = {};

    var main = views.main = blessed.box({
        parent: ui.screen
      , width: '100%'
      , height: '100%'
      , bg: 17
    });

    views.version = blessed.text({
        parent: views.main
      , height: 1
      , fg: 27
      , bg: main.style.bg
      , padding: {left: 1}
      , content: version
    })

    views.logo = blessed.textarea({
        parent: views.main
      , shrink : true
      , height: 3
      , left: 15
      , top: 'center'
      , padding: {
           top: 1
          , bottom: 1
          , left: 2
          , right: 2
        }
      , border: {
          type: 'line',
          bg: 52
        }
      , style: {
            bg: 52
          , fg: 230
        }
    });

    function showAttribution() {
        views.attribution = blessed.text({
            parent: views.main
          , top: views.logo.top + views.logo.height + 2
          , height: 2
          , width: 50
          , left: 19
          , align: 'center'
          , style: {fg: 'white', bg: main.style.bg, bold:true}
          , content: 'A Game by Casey Duncan\nwith help from friends and contributors'
        })
        ui.render()
    }

    fs.readFile(path.join(__dirname, 'logo.txt'), {encoding: 'utf-8'},
        function(err, data) {
            if (err) throw err;
            var lines = data.split('\n'),
                shown = 0;
            (function showLine() {
                if (shown++ < lines.length) {
                    var chopped = lines.map(function(line) {return line.slice(0,shown*3)})
                    views.logo.content = chopped.slice(0,shown).join('\n')
                    views.logo.height = Math.max(shown + 3, 6)
                    ui.screen.render()
                    setTimeout(showLine, 20)
                } else {
                    setTimeout(showAttribution, 400)
                }
            })()
        }
    );

/*
    (function slideUp() {
        if (views.logo.top > 4) {
            views.logo.top -= 1
            setTimeout(slideUp, 500);
        }
    })()
*/
    return views;
}

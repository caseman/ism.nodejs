var blessed = require('blessed')
  , fs = require('fs')
  , path = require('path')
  , ui = require('./ui')
  , prefs = require('../lib/prefs')
  , version = require('../package.json').version

module.exports = function TitleView() {
    var views = {}

    var main = views.main = blessed.box({
        parent: ui.screen
      , right: 25
      , height: '100%'
      , bg: 0
      , keys: true
    })

    views.version = blessed.text({
        parent: views.main
      , height: 1
      , fg: 88
      , bg: main.style.bg
      , padding: {left: 1}
      , content: version
    })

    views.logo = blessed.textarea({
        parent: views.main
      , shrink : true
      , height: 3
      , left: 'center'
      , top: 'center'
      , wrap: false
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
    })

    function showAttribution() {
        views.attribution = blessed.text({
            parent: views.main
          , top: views.logo.top + views.logo.height + 2
          , height: 2
          , width: 50
          , left: 'center'
          , align: 'center'
          , wrap: false
          , style: {fg: 'white', bg: main.style.bg, bold:true}
          , content: 'A Game by Casey Duncan\nwith help from friends and contributors'
        })
        ui.render()
    }

    fs.readFile(path.join(__dirname, 'logo.txt'), {encoding: 'utf-8'},
        function(err, data) {
            if (err) throw err
            var lines = data.split('\n')
              , shown = 0;
            (function showLine() {
                if (shown++ < lines.length) {
                    var chopped = lines.map(function(line) {return line.slice(0,shown*3)})
                    views.logo.content = chopped.slice(0,shown).join('\n')
                    views.logo.width = Math.max(shown * 3, 6)
                    views.logo.height = Math.max(shown + 3, 6)
                    ui.screen.render()
                    setTimeout(showLine, 20)
                } else {
                    setTimeout(showAttribution, 400)
                }
            })()
        }
    )

    var menu = views.menu = blessed.box({
        parent: ui.screen
      , width: 25
      , right: 0
      , padding: 1
      , style: {bg: 234}
    })

    var buttonCount = 0

    function button(name, content, key) {
        var bttn = blessed.button({
            parent: menu
          , height: 1
          , bottom: buttonCount++ * 2 + 1
          , left: 1
          , right: 1
          , name: name
          , content: content
          , parseTags: true
          , align: 'center'
          , style: {
                bg: 234
              , fg: 15
              , hover: {bg: 229, fg: 234}
            }
        })
        blessed.text({
            parent: menu
          , height: 1
          , bottom: buttonCount * 2
          , left: 1
          , right: 1
          , content: '───────────────────────'
          , style: {
                bg: 234
              , fg: 237
          }
        })
        bttn.on('click', function() {
            menu.emit('click ' + bttn.name)
        })
        main.key(key, function() {
            menu.emit('click ' + bttn.name)
        })
        return bttn
    }

    views.exitButton = button('exitButton', 'E{underline}x{/underline}it', ['x', 'escape'])
    views.remoteButton = button('hostButton', '{underline}H{/underline}ost Games', 'h')
    views.remoteButton = button('joinButton', '{underline}J{/underline}oin Remote Game', 'j')
    views.localButton = button('localButton', 'Start {underline}L{/underline}ocal Game', 'l')
    if (prefs.get('games')) {
        views.resumeButton = button('resumeButton', '{underline}R{/underline}esume Game', 'r')
    }

    views.medallion = blessed.box({
        parent: menu
      , shrink: true
      , left: 2
      , right: 1
      , wrap: false
      , content: fs.readFileSync(path.join(__dirname, 'double-eagle.txt'), {encoding: 'utf-8'})
      , style: {fg: 221, bg: 234}
    })

    return views
}

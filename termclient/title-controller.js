var Ctor = require('../lib/ctor')
  , async = require('async')
  , titleViews = require('./title-view')
  , server = require('../lib/server')
  , prefs = require('../lib/prefs')
  , log = require('../lib/logging').log
  , ui = require('./ui')

var Title = Ctor(function() {
    this.init = function(app) {
        this.app = app;
        var views = this.views = titleViews()

        views.menu.on('click exitButton', process.exit);
        views.menu.on('click startLocalButton', this.playLocalGame.bind(this))
        views.menu.on('click resumeGameButton', this.resumeGame.bind(this))
    }

    this.show = function() {
        var view = this.views.main
        ui.screen.append(view)
        view.focus()
        ui.render()
    }

    this.createGame = function(configs, cb) {
        var ctrlr = this
          , progressView = ui.progress({label: ' Creating Game '})
          , gameCreated = function(err, gameInfo) {
                progressView.detach()
                ui.render()
                cb(err, gameInfo)
            }
        this.views.main.append(progressView)
        ctrlr.client.createGame(configs, gameCreated, function(progress) {
            progressView.setProgress(progress)
        })
    }

    this.playLocalGame = function() {
        var ctrlr = this
          , action
        async.waterfall([
            function startServer(cb) {
                action = 'starting the server'
                server.useLocal(prefs.path() || prefs.defaultPath(), cb)
            }
          , function connect(serverInfo, cb) {
                action = 'connecting to the server'
                ctrlr.app.connect(serverInfo, cb)
            }
          , function createGame(client, cb) {
                action = 'creating the map'
                ctrlr.client = client
                ctrlr.createGame(['small'], cb)
            }
          , function playGame(gameInfo, cb) {
                action = 'joining it'
                ctrlr.client.joinGame(gameInfo.uid)
                ctrlr.client.startGame(gameInfo.uid)
                cb(null)
            }
        ]
        , function(err) {
            if (err == 'cancelled') {
                ctrlr.app.showTitle()
            } else if (err) {
                log.error('Error starting local game', err)
                log.error((new Error()).stack)
                ui.errorDialog(
                    'Could not start the game due to an error while ' + action + '.'
                  , err
                  , function() {ctrlr.app.showTitle()}
                )
            }
        })
    }

    this.showGamesList = function(cb) {
        var games = this.app.previousGamesByTime()
        var gameTitles = games.map(function(game) {
            var date = new Date(game.gameInfo.turnTime || game.gameInfo.created)
              , title = date.toDateString() + ' ' + date.getHours() + ':' + date.getMinutes()
            if (game.gameInfo.turnNumber) title += ' turn:' + game.gameInfo.turnNumber
            title += (game.host == '127.0.0.1') ? ' (local)' : ' ' + game.host
            return title
        })
        ui.listDialog({
            label: ' Select a Game '
          , items: gameTitles
        }, function(index) {cb(null, index)})
        return games
    }

    this.resumeGame = function() {
        var ctrlr = this
        this.showGamesList(function(err, index) {
            if (index === null) return
            var game = ctrlr.app.previousGamesByTime()[index]
            if (!game) return
            if (game.host == '127.0.0.1' || game.host == 'localhost') {
                server.useLocal(prefs.path() || prefs.defaultPath(), function(err, serverInfo) {
                    if (!err) {
                        serverInfo.cid = game.cid
                        ctrlr.app.connect(serverInfo)
                    }
                })
            } else {
                ctrlr.app.connect(game)
            }
        })
    }
})

module.exports = function TitleController(app) {
    return new Title(app)
}


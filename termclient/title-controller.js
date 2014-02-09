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
        views.menu.on('click joinRemoteButton', this.joinGame.bind(this))
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

    this.formatGameTitles = function(games) {
        return games.map(function(game) {
            var info = game.gameInfo || game
            var date = new Date(info.turnTime || info.created)
              , title = date.toDateString() + ' ' + date.getHours() + ':' + date.getMinutes()
            if (info.turnNumber) title += ' turn:' + info.turnNumber
            if (game.host) title += (game.host == '127.0.0.1') ? ' (local)' : ' ' + game.host
            return title
        })
    }

    this.showGamesList = function(games, buttons, cb) {
        ui.listDialog({
              label: ' Select a Game '
            , items: this.formatGameTitles(games)
          }
          , buttons
          , function(result) {cb(null, result)}
        )
        return games
    }

    this.resumeGame = function() {
        var ctrlr = this
        var games = ctrlr.app.previousGamesByTime()
        this.showGamesList(games, ['Resume', 'Cancel'], function(err, result) {
            if (err || !result) return
            var game = games[result.selected]
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

    this.showRemoteGames = function(client) {
        var ctrlr = this
        client.listGames(function(err, games) {
            ctrlr.showGamesList(games, ['Join', 'Create Game', 'Cancel']
              , function(err, result) {
                    if (err || !result) return
                    if (result.Join) {
                        var game = games[result.selected]
                        if (game) client.joinGame(game.uid)
                    }
                }
            )
        })
    }

    this.joinGame = function() {
        var ctrlr = this
          , lastServer = prefs.get('lastServer') || {}
        this.app.showConnectDialog(lastServer, null, function(err, client) {
            if (!err) {
                ctrlr.client = client
                prefs.save('lastServer', {host: client.serverHost, port: client.serverPort})
                ctrlr.showRemoteGames(client)
            }
        })
    }
})

module.exports = function TitleController(app) {
    return new Title(app)
}


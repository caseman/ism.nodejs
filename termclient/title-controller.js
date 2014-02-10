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

    this.errorHandler = function(actionName) {
        var ctrlr = this
        return function(err) {
            if (err == 'cancelled') {
                ctrlr.app.showTitle()
            } else if (err) {
                log.error('Error starting local game', err)
                log.error((new Error()).stack)
                ui.errorDialog(
                    'Could not ' + actionName +
                    ' the game due to an error while ' + ctrlr.currentAction + '.'
                  , err
                  , function() {ctrlr.app.showTitle()}
                )
            }
        }
    }

    this.playLocalGame = function() {
        var ctrlr = this
        async.waterfall([
            function startServer(cb) {
                ctrlr.currentAction = 'starting the server'
                server.useLocal(prefs.path() || prefs.defaultPath(), cb)
            }
          , function connect(serverInfo, cb) {
                ctrlr.currentAction = 'connecting to the server'
                ctrlr.app.connect(serverInfo, cb)
            }
          , function createGame(client, cb) {
                ctrlr.currentAction = 'creating the map'
                ctrlr.client = client
                ctrlr.createGame(['small'], cb)
            }
          , function playGame(gameInfo, cb) {
                ctrlr.currentAction = 'joining it'
                ctrlr.client.joinGame(gameInfo.uid)
                ctrlr.client.startGame(gameInfo.uid)
                cb()
            }
        ]
        , this.errorHandler('start'))
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
          , joinBttn = 'Join'
          , createBttn = 'Create Game'
        async.waterfall([
            function(cb) {
                this.currentAction = 'listing games'
                client.listGames(cb)
            }
          , function(games, cb) {
                ctrlr.showGamesList(games, [joinBttn, createBttn, 'Cancel']
                  , function(err, dialogResult) {cb(err, dialogResult, games)}
                )
            }
          , function(dialogResult, games, cb) {
                if (dialogResult[joinBttn]) {
                    cb(null, games[dialogResult.selected])
                } else if (dialogResult[createBttn]) {
                    this.currentAction = 'creating the map'
                    ctrlr.createGame(['small'], cb)
                } else {
                    cb('cancelled')
                }
            }
          , function(gameInfo, cb) {
                this.currentAction = 'joining it'
                ctrlr.client.joinGame(gameInfo.uid)
                ctrlr.client.startGame(gameInfo.uid)
                cb()
            }
        ]
        , this.errorHandler('join')
        )
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


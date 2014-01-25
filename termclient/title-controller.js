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
})

module.exports = function TitleController(app) {
    return new Title(app)
}


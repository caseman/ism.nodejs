var Ctor = require('../lib/ctor')
  , log = require('../lib/logging').log
  , client = require('../lib/client')
  , ui = require('./ui')
  , prefs = require('../lib/prefs')
  , MainController = require('./main-controller');

var App = Ctor(function() {
    this.init = function(options) {
        this.options = options || {};
        if (!ui.screen) ui.initScreen()
    }

    this.connect = function(serverInfo, cb) {
        var app = this;

        if (!serverInfo.host || !serverInfo.port) {
            app.showConnectDialog(serverInfo, '', cb);
        } else {
            var newClient = client.create(serverInfo);
            var connectErrorCb = function(name, err) {
                app.showConnectDialog(serverInfo, 'Error: ' + err.description, cb);
            }
            newClient.once('error', connectErrorCb);
            newClient.once('connection', function() {
                newClient.removeListener('error', connectErrorCb);
                app.useClient(newClient, function() {
                    if (cb) cb(null, newClient)
                })
            });
        }
    }

    this.showConnectDialog = function(serverInfo, errorMsg, cb) {
        var app = this;

        ui.show('connect-dialog')(serverInfo, errorMsg, function(confirmed) {
            if (confirmed) {
                app.connect(serverInfo, cb);
            } else {
                if (cb) cb('cancelled')
            }
        });
    }

    this.useClient = function(appClient, cb) {
        if (this.client) this.client.close();
        this.client = appClient;
        this.mainController = new MainController(this.client);
        var updateGames = function(gameInfo) {
            var games = prefs.get('games') || {}
            games[appClient.cid] = {
                cid: appClient.cid
              , host: appClient.serverHost
              , port: appClient.serverPort
              , gameInfo: gameInfo
            }
            prefs.save('games', games)
        }
        appClient.on('joinGame', function(gameState) {updateGames(gameState.info)})
        appClient.on('updateGame', updateGames)
        this.client.handshake(cb || function() {})
    }

    this.previousGamesByTime = function() {
        var games = prefs.get('games')
        if (!games) return []
        var gamesArray = Object.keys(games).map(function(cid) {
            return games[cid]
        })
        return gamesArray.sort(function(a, b) {
            return new Date(b.gameInfo.turnTime || b.gameInfo.created)
                -  new Date(a.gameInfo.turnTime || a.gameInfo.created)
        });
    }

    this.reportError = function(msg, err, cb) {
        log.error(msg, err);
        ui.show('error-dialog')(msg, err, function() {
            if (err.isFatal) process.exit();
            if (typeof cb == 'function') cb();
        });
    }

    this.showTitle = function() {
        ui.clearScreen()
        if (!this.titleController) {
            this.titleController = require('./title-controller')(this)
        }
        this.titleController.show()
    }

});

exports.create = function(options) {
    return new App(options);
}

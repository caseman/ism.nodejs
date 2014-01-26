var Ctor = require('../lib/ctor')
  , log = require('../lib/logging').log
  , client = require('../lib/client')
  , ui = require('./ui')
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
            log.info(serverInfo)
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
        this.client.handshake(cb || function() {})
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

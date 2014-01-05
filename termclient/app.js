var async = require('async')
  , Ctor = require('../lib/ctor')
  , log = require('../lib/logging').log
  , client = require('../lib/client')
  , ui = require('./ui');

App = Ctor(function() {
    this.init = function(options) {
        this.options = options || {};
    }

    this.show = function(viewName) {
        var viewCtor = require('./' + viewName);

        return function() {
            viewCtor.apply(null, arguments);
        }
    }

    this.connect = function() {
        var app = this;

        if (!app.options.serverHost || !app.options.serverPort) {
            app.showConnectDialog();
        } else {
            var newClient = client.create(app.options.serverPort, app.options.serverHost);
            newClient.once('error', function(name, err) {
                app.options.connectMsg = 'Error: ' + err.description;
                app.showConnectDialog();
            });
            newClient.once('connection', function() {
                newClient.removeAllListeners('error');
                app.useClient(newClient);
            });
        }
    }

    this.showConnectDialog = function() {
        var app = this;

        app.show('connect-dialog')(app.options, function(confirmed) {
            if (confirmed) {
                app.connect();
            } else if (app.starting) {
                process.exit();
            }
        });
    }

    this.useClient = function(appClient) {
        if (this.client) this.client.close();
        this.client = appClient;
        // TODO bind events
    }

    this.reportError = function(msg, err, cb) {
        log.error(msg, err);
        this.show('error-dialog')(msg, err, function() {
            if (err.isFatal) process.exit();
            if (typeof cb == 'function') cb();
        });
    }

    this.start = function() {
        this.starting = true;
        ui.initScreen();
        this.connect();
    }

});

exports.create = function(options) {
    return new App(options);
}

var blessed = require('blessed')
  , async = require('async')
  , Ctor = require('../lib/ctor')
  , log = require('../lib/logging').log
  , client = require('../lib/client');

App = Ctor(function() {
    this.init = function(options) {
        this.options = options || {};
        this.screen = blessed.screen();
    }

    this.show = function(viewName) {
        var screen = this.screen
          , viewCtor = require('./' + viewName);

        return function() {
            var view = viewCtor.apply(null, arguments);
            screen.append(view);
            view.focus();
            screen.render();
        }
    }

    this.connect = function() {
        var app = this;

        if (!app.options.serverHost || !app.options.serverPort) {
            app.showConnectDialog();
        } else {
            try {
                //var newClient = client.create(app.options.serverPort, app.options.serverHost);
            } catch (err) {
                app.reportError('Error connecting to server', err, function() {
                    if (app.starting) app.showConnectDialog();
                });
                return;
            }
            //app.useClient(newClient);
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
        this.connect();
    }

});

exports.create = function(options) {
    return new App(options);
}

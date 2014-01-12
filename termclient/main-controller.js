var Ctor = require('../lib/ctor')
  , ui = require('./ui')
  , extend = require('extend')
  , log = require('../lib/logging').log
  , mainViews = require('./main-view');

module.exports = Ctor(function() {
    this.init = function(client) {
        var ctrlr = this;
        var views = this.views = mainViews();

        client.on('updatePerson', ui.render);
        client.on('updateGame', ui.render);
        client.on('updateNation', ui.render);
        client.on('joinGame', function(game) {
            views.map.game = game;
            var location = game.nation.startLocation;
            views.map.scrollCentering(location[0], location[1]);
            views.map.focus();
            ui.render();
        });

        views.main.on('mouse', function(mouse) {
            if (mouse.action == 'mousemove') ctrlr.updateStatusText(mouse);
        });
    }

    this.updateStatusText = function(position) {
        var tile = this.views.map.tileAt(position.x, position.y)
          , status;
        if (tile) {
            var objects = tile.objects.map(function(obj) {return capitalize(obj.type)})
              , status = capitalize(tile.terrain);
            if (tile.biome) status = capitalize(tile.biome) + ', ' + status;
            if (objects.length) status += ' (' + objects.join(', ') + ')';
        } else {
            status = 'Unexplored';
        }
        this.views.statusText.content = status;
        ui.render();
    }

});

function capitalize(s) {
    if (!s) return '';
    return s[0].toLocaleUpperCase() + s.slice(1).toLocaleLowerCase();
}


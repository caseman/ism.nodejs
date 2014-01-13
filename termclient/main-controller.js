var Ctor = require('../lib/ctor')
  , ui = require('./ui')
  , extend = require('extend')
  , log = require('../lib/logging').log
  , mainViews = require('./main-view');

module.exports = Ctor(function() {
    this.init = function(client) {
        var ctrlr = this;
        var views = this.views = mainViews();
        this.client = client;

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

        views.main.key([','], function() {
            ctrlr.selectIndex(ctrlr.selected !== undefined ? 
                ctrlr.selected - 1 : client.gameState.nation.people.length - 1);
        });
        views.main.key(['.'], function() {
            ctrlr.selectIndex(ctrlr.selected !== undefined ? 
                ctrlr.selected + 1 : 0);
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

    this.people = function() {
        var game = this.client.gameState;
        return game.nation.people.map(function(uid) {
            return game.people[uid];
        });
    }

    this.selectIndex = function(index) {
        var people = this.people();
        this.selected = (index + people.length) % people.length;
        this.views.map.data.cursor = people[this.selected].location;
        ui.render();
    }

});

function capitalize(s) {
    if (!s) return '';
    return s[0].toLocaleUpperCase() + s.slice(1).toLocaleLowerCase();
}


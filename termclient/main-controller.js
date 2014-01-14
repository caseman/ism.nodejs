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
        views.main.on('focus', function() {views.map.focus()});

        views.map.key([','], function() {
            var index = ctrlr.selectedPersonIndex();
            ctrlr.selectPersonByIndex(index !== undefined 
                ? index - 1 : client.gameState.nation.people.length - 1);
        });
        views.map.key(['.'], function() {
            var index = ctrlr.selectedPersonIndex();
            ctrlr.selectPersonByIndex(index !== undefined ? index + 1 : 0);
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

    /*
     * Return the people in this player's nation sorted by their
     * location on the map for selection purposes
     */
    this.people = function() {
        var game = this.client.gameState;
        var people = game.nation.people.map(function(uid) {
            return game.people[uid];
        });
        return people.sort(function(a, b) {
            return a.location[0] - b.location[0] || a.location[1] - b.location[1];
        });
    }

    this.selectedPersonIndex = function() {
        if (this.selectedPersonUid) {
            var people = this.people();
            for (var i = 0; i < people.length; i++) {
                if (people[i].uid == this.selectedPersonUid) return i;
            }
        }
    }

    this.selectPersonByIndex = function(index) {
        var people = this.people()
          , map = this.views.map;
        index = (index + people.length) % people.length;
        this.selectedPersonUid = people[index].uid;
        map.setCursor.apply(map, people[index].location);
        ui.render();
    }

});

function capitalize(s) {
    if (!s) return '';
    return s[0].toLocaleUpperCase() + s.slice(1).toLocaleLowerCase();
}


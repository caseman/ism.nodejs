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

        client.on('updateGame', ui.render);
        client.on('updateNation', ui.render);

        client.on('joinGame', function(game) {
            if (!views.main.parent) ui.screen.append(views.main);
            views.map.game = game;
            var location = game.nation.startLocation;
            views.map.scrollCentering(location[0], location[1]);
            views.map.focus();
            ui.render();
        });

        client.on('updatePerson', function(person) {
            if (person.uid == ctrlr.selectedPersonUid) {
                ctrlr.selectPerson(person);
            }
            ui.render();
        });

        views.map.on('mouse', function(mouse) {
            if (mouse.action == 'mousemove') {
                ctrlr.updateStatusTextForTile(views.map.tileAt(mouse.x, mouse.y));
            }
        });
        views.map.on('click', function(mouse) {
            var tile = views.map.tileAt(mouse.x, mouse.y);
            if (tile) tile.objects.forEach(function(obj) {
                if (obj.type == 'person' && obj.nationUid == client.gameState.nation.uid) {
                    ctrlr.selectPerson(obj);
                }
            });
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
        views.map.key('escape', function() {
            views.main.detach();
            ui.render()
        })
        views.map.on('keypress', function(ch, key) {
            if (ch && ctrlr.selectedPersonUid && !key.shift && !key.ctrl) {
                var dx = 0
                  , dy = 0;
                dy -= ch === 'k' || ch === 'y' || ch === 'u'
                dy += ch === 'j' || ch === 'b' || ch === 'n'

                dx -= ch === 'h' || ch === 'y' || ch === 'b'
                dx += ch === 'l' || ch === 'n' || ch === 'u'

                if (dx || dy) client.movePerson(ctrlr.selectedPersonUid, dx, dy);
            }
        });

    }

    this.updateStatusTextForTile = function(tile) {
        var status;
        if (tile) {
            var objects = tile.objects.map(function(obj) {return capitalize(obj.type)})
            status = capitalize(tile.terrain);
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
        var people = this.people();
        index = (index + people.length) % people.length;
        this.selectPerson(people[index]);
    }

    this.selectPerson = function(person) {
        var map = this.views.map
          , game = this.client.gameState;
        this.selectedPersonUid = person.uid;
        map.setCursor.apply(map, person.location);
        this.updateStatusTextForTile(
            game.tile.apply(game, person.location));
    }

});

function capitalize(s) {
    if (!s) return '';
    return s[0].toLocaleUpperCase() + s.slice(1).toLocaleLowerCase();
}


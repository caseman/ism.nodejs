var Ctor = require('../lib/ctor')
  , blessed = require('blessed')
  , extend = require('extend')
  , ui = require('./ui')
  //, log = require('../lib/logging').log

module.exports = Ctor(function() {
    this.init = function(mainController) {
        var ctrlr = this
        this.main = mainController
        var client = this.main.client
        var panel = this.panelView = this.main.views.sidePanel

        this.nationTitle = blessed.text({
            parent: panel
          , top: 0
          , height: 1
          , width: '100%'
          , align: 'center'
          , style: {bg: 0, fg: 15}
        })
        client.on('updateNation', function(nation) {
            ctrlr.nationTitle.content = nation.name
            ui.render()
        })

        this.personPanel = blessed.box({
            top: 2
          , left: 1
          , right: 1
          , height: 10
          , style: panel.style
        })
        this.personName = blessed.text({
            parent: this.personPanel
          , top: 0
          , height: 1
          , width: '100%'
          , style: extend({underline:true}, panel.style)
        })
        this.personTraits = blessed.text({
            parent: this.personPanel
          , top: 1
          , height: 1
          , width: '100%'
          , style: panel.style
        })
        this.personHealth = blessed.text({
            parent: this.personPanel
          , top: 3
          , height: 1
          , width: '100%'
          , tags: true
          , style: panel.style
        })
        this.personStamina = blessed.text({
            parent: this.personPanel
          , top: 4
          , height: 1
          , width: '100%'
          , tags: true
          , style: panel.style
        })
        this.personEquip = blessed.text({
            parent: this.personPanel
          , top: 6
          , height: 3
          , tags: true
          , style: panel.style
        })
        client.on('updatePerson', this.updatePersonPanel.bind(this))

        this.endTurnBttnTop = blessed.text({
            parent: panel
          , bottom: 2
          , height: 1
          , left: 1
          , right: 1
          , content: '▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂'
          , style: {
              fg: 130
            , bg: 'blue'
          }
        })
        this.endTurnBttn = blessed.button({
            parent: panel
          , mouse: true
          , height: 1
          , bottom: 1
          , left: 1
          , right: 1
          , content: 'End Turn'
          , align: 'center'
          , style: {
              fg: 15
            , bg: 130
          }
        })
        this.endTurnBttnBot = blessed.text({
            parent: panel
          , bottom: 0
          , height: 1
          , left: 1
          , right: 1
          , content: '▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇'
          , style: {
              fg: 'blue'
            , bg: 130
          }
        })
        this.endTurnBttn.on('click', client.endTurn.bind(client))
        this.endTurnBttn.on('mouseover', function() {
            ctrlr.endTurnBttnColor(15, 0)
        })
        this.endTurnBttn.on('mouseout', this.updateEndTurnButton.bind(this))

        client.on('waitForNextTurn', this.updateEndTurnButton.bind(this))
        client.on('turnBegins', this.updateEndTurnButton.bind(this))
        client.on('updatePerson', this.updateEndTurnButton.bind(this))
        client.on('joinGame', this.updateEndTurnButton.bind(this))

        ui.render()
    }

    this.updateEndTurnButton = function() {
        if (this.main.client.waiting) {
            this.endTurnBttn.content = 'Waiting for Players'
            this.endTurnBttnColor(243)
        } else {
            this.endTurnBttn.content = 'End Turn'
            var people = this.main.client.gameState.people
            for (var uid in people) {
                if (people[uid].stamina > 0) {
                    this.endTurnBttnColor(130)
                    return
                }
            }
            this.endTurnBttnColor(34)
        }
    }

    this.endTurnBttnColor = function(color, textColor) {
        this.endTurnBttnTop.style.fg = color
        this.endTurnBttn.style.bg = color
        this.endTurnBttn.style.fg = textColor !== undefined ? textColor : 15
        this.endTurnBttnBot.style.bg = color
        ui.render()
    }

    this.updatePersonPanel = function(person) {
        if (person.uid === this.main.selectedPersonUid) {
            this.personName.content = (person.name || 'Person')
            this.personTraits.content = Object.keys(person.bonusTraits).join(', ')
            this.personHealth.content = 'hp: ' + person.hp + '/' + person.maxHp
            if (person.stamina > 0) {
                this.personStamina.content = 'st: ' + person.stamina + '/' + person.maxStamina
            } else {
                this.personStamina.content = 'st: {red-bg}' + person.stamina + '/' + person.maxStamina + '{/red-bg}'
            }
            var itemDescr = person.items.length ? person.items.join(', ') : '(none)'
            this.personEquip.content = 'Items: ' + itemDescr
            ui.render()
        }
    }

    this.personSelected = function(person) {
        if (person) {
            if (!this.personPanel.parent) this.panelView.append(this.personPanel)
            this.updatePersonPanel(person)
        } else {
            this.personPanel.detach()
            ui.render()
        }
    }

})





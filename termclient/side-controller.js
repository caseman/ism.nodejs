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
          , style: panel.style
        })
        this.personStamina = blessed.text({
            parent: this.personPanel
          , top: 4
          , height: 1
          , width: '100%'
          , style: panel.style
        })
        client.on('updatePerson', this.updatePersonPanel.bind(this))

        blessed.text({
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
        blessed.text({
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

        ui.render()
    }

    this.updatePersonPanel = function(person) {
        if (person.uid === this.main.selectedPersonUid) {
            this.personName.content = (person.name || 'Person')
            this.personTraits.content = Object.keys(person.bonusTraits).join(', ')
            this.personHealth.content = 'hp: ' + person.hp + '/' + person.maxHp
            this.personStamina.content = 'st: ' + person.stamina + '/' + person.maxStamina
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





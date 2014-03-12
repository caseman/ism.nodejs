var ui = require('../termclient/ui');

ui.initScreen();

var progressView = ui.progress({parent: ui.screen, label: 'Creating Game'})
function prog(p) {
    progressView.setProgress(p)
    if (p < 100) setTimeout(function() {prog(p + 1)}, 100)
}
prog(0)

ui.screen.key('escape', process.exit)


var ui = require('../termclient/ui');

ui.initScreen();

ui.dialog({label:'This is a Test'}, ['OK', 'Cancel'], function(wat) {
    console.log(wat);
});

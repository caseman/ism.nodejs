/*
 * Local server child process module
 */
var server = require('./server')
  , logging = require('./logging')
  , db = require('./db')

var localServer

function start() {
    var serverDb = db.open(process.argv[1] || db.defaultPath(), function(err) {
        if (err) {
            logging.log.error('Error opening database: ' + err);
            process.send({error: err})
            process.exit(1)
        }
    })
    localServer = new server.Server(serverDb)
    localServer.start(0, '127.0.0.1', function(info) {
        process.title = 'ism server ' + info.host + ':' + info.port
        process.send(info)
    })
}

process.on('message', function(msg) {
    if (msg.logging) logging.configure(msg)
    if (msg == 'start') start()
})

/*
 * Local server child process module
 */
var server = require('./server')
  , logging = require('./logging')
  , db = require('./db')

var localServer

function start() {
    var dbPath = process.argv[process.argv.length - 1]
    var serverDb = db.open(dbPath || db.defaultPath(), function(err) {
        if (err) {
            logging.log.error('Error opening database: ' + err);
            process.send({error: err.toString()})
            process.exit(1)
        } else {
            localServer = new server.Server(serverDb)
            localServer.start(0, '127.0.0.1', function(info) {
                process.title = 'ism server ' + info.host + ':' + info.port
                process.send(info)
            })
        }
    })
}

process.on('message', function(msg) {
    if (msg.logging) logging.configure(msg)
    if (msg == 'start') start()
})

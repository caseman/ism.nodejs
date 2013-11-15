
var charm = require('charm')()
charm.pipe(process.stdout)
charm.position(0, 0)
for (var i=0; i<256; i++){
  charm.background(i).write('' + i)
  charm.background(0).write(' ')
}

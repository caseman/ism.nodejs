
var charm = require('charm')()
charm.pipe(process.stdout)
charm.position(0, 0)
for (var i=0; i<256; i++){
  var istr = i.toString();
  while (istr.length < 5) istr = ' ' + istr;
  while (istr.length < 9) istr += ' ';
  charm.background(i).write(istr)
  charm.background(0).write(' ')
}

var chroma = require('chroma-js')
  , cdiff = require('color-diff')
  , hexPalette = require('./hex-color-palette.json')

function chromaToDiffColor(color) {
    var rgb = color.rgb()
    return {R:rgb[0], G:rgb[1], B:rgb[2]}
}

var chromaPalette = hexPalette.map(function(hex) {return chroma(hex)})
  , diffPalette = chromaPalette.map(chromaToDiffColor)
  , darkenedIndex = [];

for (var i = 0; i < diffPalette.length; i++) {
    var darkened = chromaPalette[i].darken(30).desaturate(10)
    var closest = cdiff.closest(chromaToDiffColor(darkened), diffPalette)
    darkenedIndex[i] = diffPalette.indexOf(closest)
}

console.log(darkenedIndex)

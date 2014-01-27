// data from https://github.com/mledoze/countries

var c = require('./countries.json')
var fs = require('fs')
var countries = []
var name

countries = c.map(function(country) {
    name = country.name
    if (name.split(' ').length > 2) {
        country.altSpellings.forEach(function(alt) {
            if (alt.length > 3 && alt.split(' ').length < 3) name = alt;
        })
    }
    if (name && country.demonym
        && name.split(' ').length < 3
        && !~name.indexOf('Island')
        && !~country.demonym.indexOf('Island')
        && !~name.indexOf('Republic')
        && !~name.indexOf('City')
        && !~name.indexOf('-')
        && !~name.indexOf(' and ')
        ) {
        return {
            name: name
          , enName: country.name
          , demonym: country.demonym
          , capitol: country.capitol
          , language: country.language[0]
        }
    }
})

fs.writeFile('data/countries.json'
    , JSON.stringify(countries.filter(function(line) {return !!line}), null, 2))



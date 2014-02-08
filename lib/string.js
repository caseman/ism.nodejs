/* String utils */

function cap(s) {
    return s[0].toLocaleUpperCase() + s.slice(1).toLocaleLowerCase()
}

function capitalize(s) {
    if (!s) return ''
    return cap(s.trim())
}
exports.capitalize = capitalize

exports.capWords = function capWords(s) {
    if (!s) return ''
    return s.trim().split(/ +/).map(cap).join(' ')
}


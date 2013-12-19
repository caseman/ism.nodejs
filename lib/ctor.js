/* Sugar for creating contructors with inheritance support */

function Ctor(Parent, memberInit) {
  if (!memberInit) {
    memberInit = Parent;
    Parent = function(){};
  }
  var F = function() {
    if (typeof this.init === 'function') {
      this.init.apply(this, arguments);
    }
  }
  memberInit.call(F.prototype = Object.create(Parent.prototype), Parent.prototype);
  return F;
}

module.exports = Ctor;

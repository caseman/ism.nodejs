/* Sugar for creating contructors with inheritance support */

function Ctor(Parent, memberInit) {
  if (!memberInit) {
    memberInit = Parent;
    Parent = function(){};
  }
  var F = function(c) {
    if (this.init && c !== Ctor) {
      this.init.apply(this, arguments);
    }
  }
  memberInit.call(F.prototype = new Parent(Ctor), Parent.prototype);
  return F;
}

module.exports = Ctor;

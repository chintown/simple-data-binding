describe('base.js', function() {
  describe('Helper', function() {
    it('`var a` should be defined only after `a = 1`.', function() {
      var a;
      expect(Helper.isDefined(a)).to.be.false;
      a = 1;
      expect(Helper.isDefined(a)).to.be.true;
    });
    it('`a.b` should be defined only after `a = {}; a.b = 1`.', function() {
      var a = {};
      expect(Helper.isDefined(a, 'b')).to.be.false;
      a.b = 1;
      expect(Helper.isDefined(a, 'b')).to.be.true;
    });
  });
  describe('Class', function() {
    it('subClass is instanceof SubClass and Class', function() {
      var SubClass = Class.extend({});
      var subClass = new SubClass();
      expect(subClass instanceof SubClass).to.be.true;
      expect(subClass instanceof Class).to.be.true;
    });
  });
});

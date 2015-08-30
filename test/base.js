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
  describe('Model', function() {
    it('by default model should be rendered in body', function() {
      var SmapleModel = Model.extend({
        'template': '<div class="sample-model">Sample Model</div>'
      });
      var model = new SmapleModel();
      model.render();
      expect($('.sample-model').size()).equal(1);
      model.m$dom.remove();
    });
    it('model should be rendered once', function() {
      var SmapleModel = Model.extend({
        'template': '<div class="sample-model">Sample Model</div>'
      });
      var model = new SmapleModel();
      var spy = sinon.spy(model, "initDataBindings");

      model.render();
      model.render();
      expect($('.sample-model').size()).equal(1);
      expect(spy.calledOnce).to.be.true;
      model.m$dom.remove();
    });
  });
});

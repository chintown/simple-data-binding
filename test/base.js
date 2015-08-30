describe('base.js', function() {
  describe('Helper', function() {
    describe('isDefined', function() {
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
  });
  describe('Class', function() {
    it('makes subClass instanceof SubClass and Class', function() {
      var SubClass = Class.extend({});
      var subClass = new SubClass();
      expect(subClass instanceof SubClass).to.be.true;
      expect(subClass instanceof Class).to.be.true;
    });
  });
  describe('Model', function() {
    describe('initView', function() {
      it('should render dom in body by default', function() {
        var SmapleModel = Model.extend({
          'template': '<div class="sample-model">Sample Model</div>'
        });
        var model = new SmapleModel();
        model.render();
        expect($('.sample-model').size()).equal(1);

        model.m$dom.remove();
      });
      it('should avoid duplicated rendering', function() {
        var SmapleModel = Model.extend({
          'template': '<div class="sample-model">Sample Model</div>'
        });
        var model = new SmapleModel();
        var spy = sinon.spy(model, 'initView');

        model.render();
        model.render();
        expect($('.sample-model').size()).equal(1);
        expect(spy.calledOnce).to.be.true;

        model.m$dom.remove();
      });
    });
    describe('initDataBindings', function() {
      describe('parseBindings', function() {
        it('should return a list of triplet', function() {
          var SmapleModel = Model.extend({
            'defaults': {
              'a': 'a',
              'b': 'b',
              'c': 'c'
            },
            'template': '\
            <div data-bind="a => foo">\
              <div data-bind="b => bar, c => baz"\
            </div>'
          });
          var model = new SmapleModel();
          var spy = sinon.spy(model, 'parseBindings');
          model.render();
          var bindings = spy.returnValues[0];
          expect(bindings.length).to.equal(3);
          expect(bindings[0].from).to.equal('a');
          expect(bindings[0].to).to.equal('foo');
          expect(bindings[2].from).to.equal('c');
          expect(bindings[2].to).to.equal('baz');
          model.m$dom.remove();
        });
      });
    });
    describe('initStates', function() {
      it('should update the state by input. but ignore unrecognized ones', function() {
        var SmapleModel = Model.extend({
          'defaults': {
            'txt': 'default text'
          }
        });
        var model = new SmapleModel();
        model.render({'txt': 'hi there!', 'foo': 'unexpected state'});
        expect(model.mStates).to.not.have.ownProperty('foo');
        expect(model.mStates.txt).to.equal('hi there!');
        model.m$dom.remove();
      });

      it('model should ignore unrecognized initial state', function() {
        // var SmapleModel = Model.extend({
        //   'template': '<div class="sample-model"\
        //     data-bind="txt => html">\
        //     </div>'
        // });
        // var model = new SmapleModel({
        //   'defaults': {
        //     'txt': 'default text'
        //   }
        // });
        // model.render({'txt': 'hi there!', 'foo': 'unexpected state'});
        //
        // model.m$dom.remove();
      });
    });
  });
});

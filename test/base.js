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
      it('should register state changes for updating dom', function() {
        var SmapleModel = Model.extend({
          'defaults': {
            's1': '<script>console.log("XSS")</script>',
            's2': '<script>alert(1)</script>',
            's3': true,
            's4': false,
            's5': 'xxx',
          },
          'template': '\
          <div class="model-1">\
            <div class="elem-1" data-bind="s1=>html"></div>\
            <div class="elem-2" data-bind="s2=>txt"></div>\
            <input class="elem-3" data-bind="s5=>val">\
            <div class="elem-4" data-bind="s3=>class--foo"></div>\
            <div class="elem-5 foo" data-bind="s4=>class--foo"></div>\
            <div class="elem-6" data-bind="s3=>hidden"></div>\
            <div class="elem-7" data-bind="s4=>hidden" hidden></div>\
            <div class="elem-8" data-bind="s5=>data-id"></div>\
            <input type="checkbox" class="elem-9" data-bind="s3=>checked">\
            <input type="checkbox" class="elem-10" data-bind="s4=>checked" checked>\
          </div>'
        });
        var model = new SmapleModel();
        model.render();
        expect($('.elem-1').html()).to.equal('<script>console.log("XSS")</script>');
        expect($('.elem-2').text()).to.equal('<script>alert(1)</script>');
        expect($('.elem-3').val()).to.equal('xxx');
        expect($('.elem-4').is('.foo')).to.be.true;
        expect($('.elem-5').is('.foo')).to.be.false;
        expect($('.elem-6').is('[hidden]')).to.be.true;
        expect($('.elem-7').is('[hidden]')).to.be.false;
        expect($('.elem-8').is('[data-id="xxx"]')).to.be.true;
        expect($('.elem-9').is(':checked')).to.be.true;
        expect($('.elem-10').is(':checked')).to.be.false;

        model.m$dom.remove();
      });
      it('should bind dom change to states', function() {
        var SmapleModel = Model.extend({
          'defaults': {
            's1': '<script>console.log("XSS")</script>',
            's2': '<script>alert(1)</script>',
            's3': true,
            's4': false,
            's5': 'xxx',
          },
          'template': '\
          <div class="model-1">\
            <input class="elem-3" data-bind="s5=>val">\
            <input type="checkbox" class="elem-9" data-bind="s4=>checked">\
          </div>'
        });
        var model = new SmapleModel();
        model.render();
        $('.elem-3').val('yyy').trigger('change');
        expect(model.mStates.s5).to.equal('yyy');
        $('.elem-9').trigger('click');
        expect($('.elem-9').is(':checked')).to.be.true;
        $('.elem-9').trigger('click');
        expect($('.elem-9').is(':checked')).to.be.false;

        model.m$dom.remove();
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
    });
    describe('statesDeps', function() {
      it('should reflect consumer state if provider state changed', function() {
        var SampleModel = Model.extend({
          'defaults': {
            'msg': '',
            'len': function() {
              return this.get('msg').length;
            }
          },
          'template': '\
            <div class="module">\
              message: <input class="user-input" data-bind="msg=>val">\
              message length:<span class="message" data-bind="len=>txt"></span>\
            </div>\
          '
        });
        var sampleModel = new SampleModel();
        sampleModel.render();
        $('.user-input').val('123').trigger('change');
        expect(sampleModel.get('len')).to.equal(3);
        $('.user-input').val('1234').trigger('change');
        expect(sampleModel.get('len')).to.equal(4);
        sampleModel.m$dom.remove();
      });
      it('should avoid looping', function() {
        var SampleModel = Model.extend({
          'defaults': {
            'b': function() {
              return this.get('c');
            },
            'c': function() {
              return this.get('b');
            }
          },
          'template': '\
            <div class="module"> </div>\
          '
        });
        var sampleModel = new SampleModel();
        var spy = sinon.spy(sampleModel, 'initStateDeps');
        sampleModel.render();
        expect(spy.returnValues[0]).to.be.false;
        sampleModel.m$dom.remove();
      });
    });
  });
});

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
    it('should give new instance an uniq id', function() {
      var SmapleModel = Model.extend({});
      var m1 = new SmapleModel();
      var m2 = new SmapleModel();
      var m3 = new SmapleModel();
      expect(m1.mId).to.equal(1);
      expect(m2.mId).to.equal(2);
      expect(m3.mId).to.equal(3);
    });
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
    describe('initEventBindings', function() {
      it('should call handler with target model if control-UI event triggered',
      function() {
        var SmapleModel = Model.extend({
          'defaults': {
            'a': '1',
            'b': '2',
            'c': '3',
            'log': 'init'
          },
          'template': '\
          <div id="a" event-bind="mouseenter => logA"\
            style="border: 1px solid black">\
            <div id="b" data-bind="b => html" event-bind="click => logB"></div>\
            <input id="c" data-bind="c => val" event-bind="blur => logC">\
            <div id="log" data-bind="log => txt"></div>\
          </div>',
          handlers: {
            'logA': function(model) { this.change('log', 'A'); },
            'logB': function(model) { this.change('log', model.get('b')); },
            'logC': function(model) { this.change('log', 'C'); },
          }
        });
        var model = new SmapleModel();
        model.render();
        $('#a').trigger('mouseenter');
        expect($('#log').text()).to.equal('A');
        $('#b').trigger('click');
        expect($('#log').text()).to.equal('2');
        $('#c').trigger('blur');
        expect($('#log').text()).to.equal('C');
        model.m$dom.remove();
      });
    });
    describe('initEventBindings', function() {
      it('should toggle state if handler matches with a state name',
      function() {
        var SmapleModel = Model.extend({
          'defaults': {
            'a': true
          },
          'template': '\
          <div>\
            <div id="a" event-bind="click => a">x</div>\
            <div id="log" data-bind="a => txt"></div>\
          </div>'
        });
        var model = new SmapleModel();
        model.render();
        $('#a').trigger('click');
        expect($('#log').text()).to.equal('false');
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
        var model = new SampleModel();
        model.render();
        $('.user-input').val('123').trigger('change');
        expect(model.get('len')).to.equal(3);
        $('.user-input').val('1234').trigger('change');
        expect(model.get('len')).to.equal(4);
        model.m$dom.remove();
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
        var model = new SampleModel();
        var spy = sinon.spy(model, 'initStateDeps');
        model.render();
        expect(spy.returnValues[0]).to.be.false;
        model.m$dom.remove();
      });
    });
  });
  describe('Colleciton', function() {
    it('should render dom properly', function() {
      var SampleCollection = Collection.extend({
        'defaults': {
          'txt': ''
        },
        'template': '<li data-bind="txt => html"></li>'
      });
      var SampleModule = Model.extend({
        'defaults': {
          'title': function() {
            return 'got ' + this.get('listing').size() + ' listing items';
          },
          'listing': new SampleCollection()
        },
        'template': '\
        <div class="sample-module">\
          <div data-bind="title => html"></div>\
          <ul data-bind="listing => inner" style="border: 1px solid black">\
        </div>'
      });

      var model = new SampleModule();
      model.render();
      expect($('.sample-module').find('ul li').length).to.be.equal(0);
      model.change('listing', function(collection) {
        collection.add({txt: 'item1'});
      });
      expect($('.sample-module').find('ul li').length).to.be.equal(1);
      expect($('.sample-module').find('ul li').html()).to.be.equal('item1');
      model.change('listing', function(collection) {
        collection.change(0, 'txt', 'item x');
      });
      expect($('.sample-module').find('ul li').html()).to.be.equal('item x');

      model.m$dom.remove();
    });
    it('should bind event properly', function() {
      var SampleCollection = Collection.extend({
        'defaults': {
          'isChecked': false,
          'message': function() {
            return this.get('isChecked') ? 'yes' : 'no';
          }
        },
        'template': '<li>\
          <div data-bind="message => txt"\
               event-bind="click => isChecked"></div>\
        </li>'
      });
      var SampleModule = Model.extend({
        'defaults': {
          'listing': new SampleCollection()
        },
        'template': '\
        <div class="sample-module">\
          <ul data-bind="listing => inner" style="border: 1px solid black">\
        </div>'
      });

      var model = new SampleModule();
      model.render();
      model.change('listing', function(collection) {
        collection.add({isChecked: true});
        collection.add({isChecked: false});
      });
      model.m$dom.remove();
    });
  });
});

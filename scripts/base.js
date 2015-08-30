(function(globals) {
  'use strict';
  console.group('base.js');
  var Helper = (function() {
    return {
      'isDefined': function() {
        var args = [].slice.call(arguments);
        var numArgs = args.length;
        if (numArgs == 1) {
          return typeof arguments[0] !== 'undefined' &&
                  arguments[0] !== null;
        } else if (numArgs == 2 && typeof arguments[1] === 'string') {
          return Helper.isDefined(arguments[0]) &&
                  arguments[1] in arguments[0];
        } else {
          console.error('isDefined: unsupported args: %o', args);
        }
      }
    };
  })();

  var EventBus = (function() {
    var bus = {};
    return {
      'subscribe': function(identifier, handler) {
        if (!Helper.isDefined(bus, identifier)) {
          bus[identifier] = [];
        }
        bus[identifier].push(handler);
      },
      'publish': function(identifier, message) {
        if (!Helper.isDefined(bus, identifier)) {
          console.error('subscribe: invalid identifier `%s`', identifier);
          return;
        }
        for (var i = 0; i < bus[identifier].length; i++) {
          bus[identifier][i](message);
        }
      }
    };
  })();

  var Class = (function() {
    function Class() {};
    Class.extend = function(extendedProperties) {
      var ChildClass = function() { // XXX
        if (this.init) {
          this.init.apply(this, arguments);
        }
      };
      ChildClass.prototype = Object.create(this.prototype); // XXX
      ChildClass.prototype.constructor = ChildClass;
      for (var k in extendedProperties) {
        ChildClass.prototype[k] = extendedProperties[k];
      }
      ChildClass.extend = Class.extend;
      return ChildClass;
    };
    return Class;
  })();

  var Model = Class.extend({
    'factoryId': 0,
    'init': function(controller) {
      this.mId = ++this.factoryId;
      this.mController = controller || this; // logic might be held by delegator
      this.m$dom = null;
      this.m$domParent = null;
      this.mStates = $.extend({}, this.defaults);
    },
    'defaults': {},
    'template': '<p>implement me</p>',
    'render': function(userInitPdo) {
      if (globals.Helper.isDefined(this.m$dom)) {
        return; // avoid duplicated rendering
      }
      this.initView(); // bone
      this.initDataBindings(); // spirit
      this.initStates(userInitPdo); // flesh
    },
    'initView': function() {
      var $container = this.mController.m$domParent || $('body');
      this.m$dom = $(this.template).appendTo($container);
    },
    'initDataBindings': function() {
      // data-bind="<state> => <domPoint> (, ...)"
      // - on <model> + <state> change, trigger <dom> + <domPoint> updating
      // - on <dom> change, trigger controller's <state> updating
      // event-bind="<event> => model<handler>"
      // - on <dom> <event>, tirgger <handler>

      if (!Helper.isDefined(this.m$dom)) {
        console.error('initDataBindings: m$dom is not ready.');
        return;
      }
      $.each(this.parseBindings('data-bind'), function(idx, binding) {

      });
    },
    'initStates': function(userInitPdo) {
      for (var k in this.mStates) {
        var v = Helper.isDefined(userInitPdo, k) ?
                userInitPdo[k] : this.mStates[k];
        console.log('initStates: %s=`%s` %s', k, v,
                    (Helper.isDefined(userInitPdo, k) ? '' : '(default)'));
        this.change(k, v);
      }
    },
    'change': function(state, value) {
      if (!Helper.isDefined(this.mStates, state)) {
        console.error('change: model does not have state: %s', state);
        return;
      }

      var self = this;
      console.group('change: %s=`%s`', state, value);
      this.mStates[state] = value;

      EventBus.publish(this.getModelStateId(state), value);

      $.each(this.getStateDeps(), function(idx, stateDep) {
        console.group('-> change: %s=`%s`', stateDep, value);
        var value = self.get(stateDep);
        EventBus.publish(self.getModelStateId(stateDep), value);
        console.groupEnd();
      });
      console.groupEnd();
    },
    'getStateDeps': function(state) {
      return []; // TODO
    },
    //--------------------------------------------------------------------------
    'getModelStateId': function(state) {
      return this.mId + '-' + state;
    },
    'parseBindings': function(attr) {
      var elems = $.makeArray(this.m$dom.find('[' + attr + ']'));
      if (this.m$dom.is('[' + attr + ']')) {
        elems.unshift(this.m$dom.get(0));
      }
      var bindings = [];
      $.each(elems, function(idx, elem) {
        var $elem = $(elem);
        var bindingLine = $elem.attr(attr).trim();
        var bindingPairs = bindingLine.split(',');
        $.each(bindingPairs, function(idx, bindingPair) {
          var parts = bindingPair.trim().split('=>');
          if (parts.length == 2) {
            bindings.push({
              '$elem': $elem,
              'from': parts[0].trim(),
              'to': parts[1].trim()
            });
          }
        });
      });
      return bindings;
    }
  });

  var exported = {
    'Helper': Helper,
    'Class': Class,
    'Model': Model
  };
  for (var k in exported) {
    globals[k] = exported[k];
  }
  console.groupEnd();
})(window);

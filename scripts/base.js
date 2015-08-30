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
    'init': function(controller) {
      this.mController = controller || this; // logic might be held by delegator
      this.m$dom = null;
      this.m$domParent = null;
      this.mStates = {};
    },
    'defaults': {},
    'template': '<p>implement me</p>',
    'render': function() {
      if (globals.Helper.isDefined(this.m$dom)) {
        return; // avoid duplicated rendering
      }
      var $container = this.mController.m$domParent || $('body');
      this.m$dom = $(this.template).appendTo($container); // bone
      this.initDataBindings(); // spirit
      // this.initStates(); // flesh
    },
    'initDataBindings': function() {

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

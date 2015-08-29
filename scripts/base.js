(function(globals) {
  'use strict';
  console.log('load base.js');
  var Helper = (function() {
    return {
      'isDefined': function() {
        var args = [].slice.call(arguments);
        var numArgs = args.length;
        if (numArgs == 1) {
          return typeof arguments[0] !== 'undefined';
        } else if (numArgs == 2 && typeof arguments[1] === 'string') {
          return arguments[1] in arguments[0];
        } else {
          console.error('isDefined: unsupported args: %o', args);
        }
      }
    };
  })();

  var Class = (function() {
    function Class() {
      if (this.init) {
        this.init.apply(this, arguments);
      }
    };
    Class.extend = function(extendedProperties) {
      var ChildClass = function() {};
      ChildClass.prototype = Object.create(Class.prototype);
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
    'init': function() {
      this.m$dom = null;
      this.m$domParent = null;
      this.mStates = {};
    },
    'defaults': {},
    'template': '<p>implement me</p>',
    'render': function() {
      if (!globals.Helper.isDefined(this.m$dom)) {
        return; // avoid duplicated rendering
      }
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

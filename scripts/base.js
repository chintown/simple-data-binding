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
      var self = this;
      $.each(this.parseBindings('data-bind'), function(idx, binding) {
        var $elem = binding.$elem;
        var state = binding.from;
        var domPoint = binding.to;

        // - on <model> + <state> change, trigger <dom> + <domPoint> updating
        console.log('on `%s` change => update %o-%s', state, $elem, domPoint);
        var viewUpdater = self.injectDomValue.bind(self, $elem, domPoint);
        EventBus.subscribe(self.getModelStateId(state), viewUpdater);

        // - on <dom> change, trigger controller's <state> updating
        var stateUpdater = self.change.bind(self, state);
        var domValExtractor = self.extractDomValue;
        if (self.isBindOnContent($elem, domPoint)) {
          var events = self.getContentChangeEvents($elem);
          console.log('on %o-%s => update %s', $elem, events, state);
          $elem.on(events, function(e) {
            var value = domValExtractor($(e.target));
            stateUpdater(value);
          });
        }
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
    },
    'injectDomValue': function($dom, domPoint, stateVal) {
      // domPoint
      // html, txt | val | class--classname | others(attr)
      if (domPoint == 'html') {
        $dom.html(stateVal);
      } else if (domPoint == 'txt') {
        $dom.text(stateVal);
      } else if (domPoint == 'val') {
        $dom.val(stateVal);
      } else if (domPoint.indexOf('class--') === 0) {
        if (typeof stateVal != 'boolean') {
          console.warn('injectDomValue: only boolean state can be bound to class. state: %o', stateVal);
          return;
        }
        var className = domPoint.substr('class--'.length);
        if (stateVal) {
          $dom.addClass(className);
        } else {
          $dom.removeClass(className);
        }
      } else {
        if (typeof stateVal == 'boolean') {
          if (stateVal) {
            $dom.attr(domPoint, true);
          } else {
            $dom.removeAttr(domPoint);
          }
        } else {
          $dom.attr(domPoint, stateVal);
        }
      }
    },
    'extractDomValue': function($dom) {
      if ($dom.is('input[type="checkbox"]')) {
        return $dom.is(':checked');
      } else if ($dom.is('select') || $dom.is('input') || $dom.is('textarea')) {
        return $dom.val();
      } else {
        return $dom.text();
      }
    },
    'isBindOnContent': function($elem, domPoint) {
      return ($elem.is('input[type="checkbox"]') && domPoint == 'checked') ||
              ($elem.is('select') && domPoint == 'val') ||
              ($elem.is('textarea') && domPoint == 'val') ||
              ($elem.is('input:not([type])') && domPoint == 'val') ||
              ($elem.is('input[type="text"]') && domPoint == 'val');
    },
    'getContentChangeEvents': function($elem) {
      if ($elem.is('input[type="checkbox"]')) {
        return 'click';
      } else if ($elem.is('input')) {
        return 'keyup change';
      } else if ($elem.is('select') | $elem.is('textarea')) {
        return 'change';
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

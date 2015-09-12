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
      },
      'makeArray': function() {
        var args = [].slice.call(arguments);
        var arr = [];
        $.each(args, function(idx, arg) {
          if (arg) {
            arr.push(arg);
          }
        });
        return arr;
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
          console.info('subscribe: no handler for `%s`', identifier);
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
      var ChildClass = function() {
        if (this.init) {
          this.init.apply(this, arguments);
        }
      };
      ChildClass.prototype = Object.create(this.prototype);
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
      this.mId = ++this.__proto__.factoryId;
      this.mController = controller || this; // logic might be held by upstream
      this.m$dom = null;
      this.m$domParent = null;
      this.mStates = $.extend({}, this.defaults);
      this.isEventBingidngDone = false;
      this.isLoopDetectingDone = false;
    },
    'isSelfControlled': function() {
      return this.mController == this;
    },
    'defaults': {},
    'template': '<p>implement me</p>',
    'handlers': {},
    'render': function(userInitPdo) {
      if (globals.Helper.isDefined(this.m$dom)) {
        return; // avoid duplicated rendering
      }
      console.group('render');
      this.initView(); // bone
      this.initDataBindings(); // spirit
      this.initEventBindings(); // spirit
      this.initStates(userInitPdo); // flesh
      console.groupEnd();
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

        if (domPoint === 'inner') {
          // $elem <-$domParent- Collection <-controller- item Model
          self.get(state).render($elem);
        }

        // - on <model> + <state> change, trigger <dom> + <domPoint> updating
        var identifier = self.getModelStateId(state);
        console.log('on `%s` change => update %o-%s', identifier, $elem, domPoint);
        var viewUpdater = self.injectDomValue.bind(self, $elem, domPoint);
        EventBus.subscribe(identifier, viewUpdater);

        // - on <dom> change, trigger controller's <state> updating
        var stateUpdater = self.change.bind(self, state);
        var domValExtractor = self.extractDomValue;
        if (self.isChangeOnContent($elem, domPoint)) {
          var events = self.getContentChangeEvents($elem);
          console.log('on %o-%s => update %s', $elem, events, state);
          $elem.on(events, function(e) {
            var value = domValExtractor($(e.target));
            stateUpdater(value);
          });
        }
      });
    },
    'initEventBindings': function() {
      // event-bind="<event> => <handler> | boolean <state>"
      // - on controler <dom> <event>, tirgger <handler>
      if (this.mController.isEventBingidngDone) {
        return;
      } else {
        this.mController.isEventBingidngDone = true;
      }

      if (!Helper.isDefined(this.m$dom)) {
        console.error('initDataBindings: m$dom is not ready.');
        return;
      }
      var self = this;
      $.each(this.parseBindings('event-bind'), function(idx, binding) {
        var $elem = binding.$elem;
        var eventName = binding.from;
        var handlerName = binding.to;

        // - on controler <dom> <event>, tirgger <handler>
        console.log('on %o-%s => trigger %s %s',
                    $elem, eventName, handlerName,
                    (self.isSelfControlled() ? '' : '(bubbled)'));
        var watcher = self.getEventWatcher($elem);
        var target = self.getEventTarget($elem);
        var handler = self.getEventHandler(handlerName);
        watcher.on.apply(watcher, Helper.makeArray(eventName, target, handler));
      });
    },
    'initStates': function(userInitPdo) {
      if (!this.initStateDeps()) {
        console.error('render: states have loop dependencies. ABORT');
        return;
      }

      for (var k in this.mStates) {
        var v = Helper.isDefined(userInitPdo, k) ?
                userInitPdo[k] : this.get(k);
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
      if (this.get(state) instanceof Collection &&
          typeof value == 'function') {
        value.call(this, this.get(state));
      } else {
        this.set(state, value);
        EventBus.publish(this.getModelStateId(state), value);
      }

      $.each(this.getStateDeps(state), function(idx, stateDep) {
        var value = self.get(stateDep);
        console.group('-> change: %s=`%s`', stateDep, value);
        self.change(stateDep, value);
        console.groupEnd();
      });
      console.groupEnd();
    },
    'get': function(state) {
      if (!Helper.isDefined(this.mStates, state)) {
        console.error('get: model does not have state: %s', state);
        return;
      }

      if (typeof this.mStates[state] == 'function') {
        return this.mStates[state].apply(this);
      } else {
        return this.mStates[state];
      }
    },
    'set': function(state, value) {
      if (!Helper.isDefined(this.mStates, state)) {
        console.error('get: model does not have state: %s', state);
        return;
      }

      if (typeof this.mStates[state] == 'function') {
        // ignore
      } else {
        return this.mStates[state] = value;
      }
    },
    //--------------------------------------------------------------------------
    'getModelStateId': function(state) {
      return this.mId + '-' + state;
    },
    'parseLeadDecoration': function(decoration, decoratedName) {
      var matches = (new RegExp('^(' + decoration + ")?(\\w+)$"))
                    .exec(decoratedName);
      return {
        'hasDecoration': Helper.isDefined(matches[1]),
        'cleanedName': matches[2]
      };
    },
    'parseBindings': function(attr) {
      var elems = $.makeArray(this.m$dom.find('[' + attr + ']'));
      if (Helper.isDefined(this.m$dom.attr(attr))) {
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
      // domPoint := html, text | val | class--classname | others(attr)
      // TODO ignore if no change
      if (domPoint == 'html') {
        $dom.html(stateVal);
      } else if (domPoint == 'text') {
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
          var nameObj = this.parseLeadDecoration('!', domPoint);
          var shouldReverse = nameObj.hasDecoration;
          domPoint = nameObj.cleanedName;
          stateVal = shouldReverse ? !stateVal : stateVal;

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
    'isChangeOnContent': function($elem, domPoint) {
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
    },
    'ptnGetter': /\.get\(['"]([a-zA-Z]+)['"]\)/gm,
    'getGetterDeps': function(fn) {
      var deps = [];
      var matches = null;
      this.ptnGetter.lastIndex = 0;
      while ((matches = this.ptnGetter.exec(fn))) {
        var dep = matches[1];
        if (deps.indexOf(dep) === -1) {
          deps.push(dep);
        }
      }
      return deps;
    },
    'stateDepMap': {},
    'initStateDeps': function() {
      // a        a: [b, c]
      // b get a  c: [b]
      //   get c  b: [c]
      // c get a
      //   get b <= cause loop
      var isValidWithoutLoop = true;

      if (this.mController.isLoopDetectingDone) {
        return isValidWithoutLoop;
      } else {
        this.mController.isLoopDetectingDone = true;
      }

      var self = this;
      var stateDepMap = this.stateDepMap;
      $.each(this.mStates, function(consumer, valOrFn) {
        if (typeof valOrFn !== 'function') {
          return;
        }
        $.each(self.getGetterDeps(valOrFn), function(idx, provider) {
          if (!Helper.isDefined(stateDepMap, provider)) {
            stateDepMap[provider] = [];
          }

          if (Helper.isDefined(stateDepMap, consumer) &&
              stateDepMap[consumer].indexOf(provider) !== -1) {
            isValidWithoutLoop = false;
            console.error('initStateDeps: loop detected: %s <=> %s',
                          consumer, provider);
          }

          stateDepMap[provider].push(consumer);
        });
      });
      this.stateDepMap = stateDepMap;
      return isValidWithoutLoop;
    },
    'getStateDeps': function(state) {
      if (!Helper.isDefined(this.stateDepMap, state)) {
        return [];
      } else {
        return this.stateDepMap[state];
      }
    },
    'getEventWatcher': function($elem) {
      var watcher;
      if (this.isSelfControlled()) {
        watcher = $elem;
      } else {
        watcher = this.mController.m$domParent;
      }
      return watcher;
    },
    'getEventTarget': function($elem) {
      var target;
      if (this.isSelfControlled()) {
        target = null;
      } else {
        target = '[event-bind="' + $elem.attr('event-bind') + '"]';
      }
      return target;
    },
    'getHandler': function(name) { // caller should bind this on it
      // INTERFACE: corresponding <item> and its <index> in collection
      var nameObj = this.parseLeadDecoration('!', name);
      var shouldReverse = nameObj.hasDecoration;
      name = nameObj.cleanedName;
      if (Helper.isDefined(this.mStates, name) &&
          typeof this.mStates[name] == 'boolean') {
        return function(item, idx) {
          var toggled = shouldReverse ?
                        item.mStates[name] : !item.mStates[name];
          item.change(name, toggled);
        };
      } else if (Helper.isDefined(this.mController.handlers, name)) {
        return this.mController.handlers[name]; // (item, idx)
      } else {
        console.error('getItemHandler: no corresponding handler for `%s`', name);
        return function(item, idx) {};
      }
    },
    'getEventHandler': function(name) {
      // INTERFACE: dom <event>
      var self = this;
      var handler = this.getHandler(name);
      var eventHandler;
      if (this.isSelfControlled()) {
        eventHandler = function(e) {
          var idx = -1;
          var model = self;
          handler.call(self.mController, model, idx);
        };
      } else {
        eventHandler = function(e) {
          var $target = $(e.target);
          var $needleDom = $target.closest('[collection-item]');
          var $stackDom = self.mController.m$domParent.find('[collection-item]');
          var idx = $stackDom.index($needleDom);
          var model = self.mController.mStates[idx];
          handler.call(self.mController, model, idx);
        };
      }
      return eventHandler;
    }
  });

  var Collection = Model.extend({
    'init': function() {
      var self = this;
      this.Item = Model.extend({
        'defaults': self.defaults,
        'template': self.template,
      });
      this.mStates = []; // override from object
    },
    'render': function(m$domParent) {
      this.m$domParent = m$domParent; // bone
      // spirit
      // module Model [view] <-$domParent\
      //                                  Collection
      // item Model          controller->/
      this.add({});
      this.remove(0);
    },
    'size': function() {
      return this.mStates.length;
    },
    'add': function(pdo) {
      // $elem <-$domParent- Collection <-controller- item Model
      var model = new this.Item(this);
      this.mStates.push(model);
      model.render(pdo);
      model.m$dom.attr('collection-item', '');
    },
    'get': function(idx, state) {
      if (idx < 0 || this.size() <= idx) {
        console.error('get: invalid idx: %d', idx);
        return;
      }
      return this.mStates[idx].get(state);
    },
    'change': function(idx, state, value) {
      if (idx < 0 || this.size() <= idx) {
        console.error('get: invalid idx: %d', idx);
        return;
      }
      return this.mStates[idx].change(state, value);
    },
    'remove': function(idx) {
      if (idx < 0 || this.size() <= idx) {
        console.error('get: invalid idx: %d', idx);
        return;
      }
      var state = this.mStates.splice(idx, 1)[0];
      state.m$dom.remove();
      state = null;
    },
    'addAll': function(pdoList) {
      var self = this;
      $.each(pdoList, function(idx, pdo) {
        self.add(pdo);
      });
    },
    'removeAll': function() {
      for (var i = this.size() - 1; i >= 0; i--) {
        this.remove(i);
      }
    }
  });

  var exported = {
    'Helper': Helper,
    'Class': Class,
    'Model': Model,
    'Collection': Collection
  };
  for (var k in exported) {
    globals[k] = exported[k];
  }
  console.groupEnd();
})(window);

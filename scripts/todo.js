(function(Helper) {
  'use strict';

  var client = (function() {
    return {
      'nextId': 3,
      'getAll': function(callback) {
        callback({
          // error:
          result: {
            items: [
              {id: 1, note: 'buy milk', isDone: false},
              {id: 2, note: '<script>alert(9)</script>', isDone: true}
            ]
          }
        });
      },
      'post': function(pdo, callback) {
        pdo.id =  this.nextId++;
        callback({
          // error:
          result: {
            item: pdo
          }
        });
      },
      'put': function(id, pdo, callback) {
        callback({
          // error:
          result: {
            item: pdo
          }
        });
      },
      'delete': function(id, callback) {
        callback({
          // error:
          result: {
            removedId: id
          }
        });
      },
    };
  })();

  // ---------------------------------------------------------------------------
  var TodoCollection = Collection.extend({
    'defaults': {
      note: '',
      isDone: false,
      isEdit: false
    },
    'template': '\
      <div class="todo-item" data-bind="isDone => class--marked-done">\
        <input type="checkbox" class="tood-is-done"\
         data-bind="isDone => checked">\
        <span class="todo-note"\
          data-bind="note => text, isEdit => hidden"\
          event-bind="click => isEdit"></span>\
        <input class="todo-note-edit"\
          data-bind="note => val, isEdit => !hidden"\
          event-bind="blur => isEdit">\
        <button class="destroy-todo"\
          event-bind="click => archive">remove</button>\
      </div>',
    'handlers': {
      'archive': function(item, idx) {
        this.remove(idx);
      }
    }
  });
  // ---------------------------------------------------------------------------
  var TodoModule = Model.extend({
    'defaults': {
      todos: function() {return new TodoCollection();}
    },
    'template': '\
    <div class="module-todo">\
      <input class="user-new-note">\
      <button class="submit-new-note"\
        event-bind="click => add"\
      >Add</button>\
      <div class="todo-listing"\
        data-bind="todos => inner"\
      ></div>\
    </div>\
    ',
    'handlers': {
      'add': function() {
        var userNote = this.m$dom.find('.user-new-note').val();
        this.change('todos', function(collection) {
          collection.add({
            note: userNote,
            isDone: false
          });
        });
      }
    }
  });
  // ---------------------------------------------------------------------------
  function normalizeTodoListing(pdoList) {
    return $.map(pdoList, function(pdo) {
      return {
        note: pdo.note,
        isDone: pdo.isDone
      };
    });
  };
  $(document).ready(function() {
    var todoModule = new TodoModule();
    todoModule.m$domParent = $('#app');
    todoModule.render();
    client.getAll(function(res) {
      if (res.error) { // TODO handle erro
        return;
      }
      todoModule.change('todos', function(collection) {
        $.each(normalizeTodoListing(res.result.items), function(idx, pdo) {
          collection.add(pdo);
        });
      });
    });
  });

})(Helper);

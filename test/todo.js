function createTestItem($dom, note) {
  var $domUserInput = $dom.find('.user-new-note');
  var $domSubmit = $dom.find('.submit-new-note');

  $domUserInput.val(note);
  $domSubmit.click();
  return $dom.find('.todo-listing .todo-item').last();
}
// function removeTestItem($dom)
describe('todo.js', function() {
  // it('TodoModule should allow user to add item', function() {
  //   var $dom = $('.module-todo');
  //   var note = 'buy some <script>food<script>';
  //   var $target = createTestItem($dom, note);
  //   $target = $target.find('.todo-note');
  //
  //   expect($target.length).not.equal(0);
  //   expect($target.text()).equal(note);
  // });
  it('TodoModule should allow user to remove item', function() {
    var $dom = $('.module-todo');
    var note = 'buy some <script>food<script>';
    var $target = createTestItem($dom, note);
    $remover = $target.find('.destroy-todo');
    $remover.click();
    console.log($remover.get(0), $target);

    // expect($target.text()).not.equal(note);
  });
});

define([
  "ember",
  "../app",
], function(Ember, Dota) {

Dota.GameFooterView = Ember.View.extend({
  template : Ember.Handlebars.compile('' +
  ''),
  gameSnapshot : null,

  classNames : ["game-footer"],
});

});

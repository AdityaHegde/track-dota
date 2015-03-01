define([
  "ember",
  "../app",
], function(Ember, Dota) {

Dota.GameBodyView = Ember.View.extend({
  template : Ember.Handlebars.compile('' +
    '{{view "gameMap"   gameSnapshot=view.gameSnapshot}}' +
    '{{view "gameStats" gameSnapshot=view.gameSnapshot}}' +
    '<div class="clearfix"></div>' +
  ''),
  gameSnapshot : null,

  classNames : ["game-body"],
});

});

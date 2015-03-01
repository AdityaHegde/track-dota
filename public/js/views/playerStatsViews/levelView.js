define([
  "ember",
  "../../app",
], function(Ember, Dota) {

Dota.LevelView = Ember.View.extend({
  template : Ember.Handlebars.compile('' +
    '{{view.player.level}}' +
  ''),
  player : null,
});

});

define([
  "ember",
  "../../app",
], function(Ember, Dota) {

Dota.CsView = Ember.View.extend({
  template : Ember.Handlebars.compile('' +
    '{{view.player.last_hits}}/{{view.player.denies}}' +
  ''),
  player : null,
});

});

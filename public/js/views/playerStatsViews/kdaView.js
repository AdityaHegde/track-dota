define([
  "ember",
  "../../app",
], function(Ember, Dota) {

Dota.KdaView = Ember.View.extend({
  template : Ember.Handlebars.compile('' +
    '{{view.player.kills}}/{{view.player.death}}/{{view.player.assists}}' +
  ''),
  player : null,
});

});

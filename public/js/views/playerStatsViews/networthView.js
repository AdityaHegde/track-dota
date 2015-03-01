define([
  "ember",
  "../../app",
], function(Ember, Dota) {

Dota.NetworthView = Ember.View.extend({
  template : Ember.Handlebars.compile('' +
    '{{view.player.net_worth}}' +
  ''),
  player : null,
});

});

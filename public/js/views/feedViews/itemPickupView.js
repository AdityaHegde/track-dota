define([
  "ember",
  "../../app",
], function(Ember, Dota) {

Dota.ItemPickupView = Ember.View.extend({
  template : Ember.Handlebars.compile('' +
    '{{#each view.feed.data.players}}' +
      '<div>' +
        '<img height="32" {{bind-attr src="playerObj.heroObj.hero_icon"}} /> Picked up ' +
        '{{#each itemObjs}}<img height="32" {{bind-attr src="itemIcon"}} />{{/each}}' +
      '</div>' +
    '{{/each}}' +
  ''),
  feed : null,
});

});

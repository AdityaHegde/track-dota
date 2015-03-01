define([
  "ember",
  "../app",
], function(Ember, Dota) {

Dota.GameFeedView = Ember.View.extend({
  template : Ember.Handlebars.compile('' +
    '{{#each controller.gameFeed}}' +
      //'{{view type feed=this}}' +
    '{{/each}}' +
  ''),

  classNames : ["game-feed"],
});

});

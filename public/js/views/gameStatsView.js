define([
  "ember",
  "../app",
], function(Ember, Dota) {

Dota.GameStatsView = Ember.View.extend({
  template : Ember.Handlebars.compile('' +
    '{{view "playerStats" class="col-md-5"}}' +
    '{{view "gameFeed"    class="col-md-7"}}' +
  ''),
  gameSnapshot : null,

  classNames : ["game-stats"],
});

});

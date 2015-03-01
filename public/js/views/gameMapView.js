define([
  "ember",
  "../app",
], function(Ember, Dota) {

Dota.GameMapView = Ember.View.extend({
  template : Ember.Handlebars.compile('' +
    '{{#each view.gameSnapshot.scoreboard.radiant.players}}' +
      '<div class="player player-radiant" {{bind-attr style="playerPosStyle"}}>' +
        '<img {{bind-attr class=":hero-minimap-icon :d2mh heroObj.hero_name"}} {{action "playerSelected" this}}/>' +
      '</div>' +
    '{{/each}}' +
    '{{#each view.gameSnapshot.scoreboard.dire.players}}' +
      '<div class="player player-dire" {{bind-attr style="playerPosStyle"}}>' +
        '<img {{bind-attr class=":hero-minimap-icon :d2mh heroObj.hero_name"}} {{action "playerSelected" this}}/>' +
      '</div>' +
    '{{/each}}' +
    '<div class="clearfix"></div>' +
  ''),
  gameSnapshot : null,

  classNames : ["game-map"],
});

});

define([
  "ember",
  "../app",
], function(Ember, Dota) {

Dota.GameHeaderView = Ember.View.extend({
  template : Ember.Handlebars.compile('' +
    '{{view "teamBanner" class="col-md-1" team=view.gameSnapshot.radiant_team type=0}}' +
    '{{view "heroHeader" class="col-md-4" teamSnapshot=view.gameSnapshot.scoreboard.radiant}}' +
    '{{view "gameTime"   class="col-md-2" gameSnapshot=view.gameSnapshot}}' +
    '{{view "heroHeader" class="col-md-4" teamSnapshot=view.gameSnapshot.scoreboard.dire}}' +
    '{{view "teamBanner" class="col-md-1" team=view.gameSnapshot.dire_team type=1}}' +
  ''),
  gameSnapshot : null,

  classNames : ["game-header"],
});

});

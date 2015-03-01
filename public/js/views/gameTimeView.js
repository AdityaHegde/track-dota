define([
  "ember",
  "../app",
], function(Ember, Dota) {

Dota.GameTimeView = Ember.View.extend({
  template : Ember.Handlebars.compile('' +
    '<div class="col-md-3">{{view.gameSnapshot.scoreboard.radiant.score}}</div>' +
    '<div class="col-md-6">' +
      '<div>{{view.displayDuration}}</div>' +
      '<div>{{view.score}}</div>' +
    '</div>' +
    '<div class="col-md-3">{{view.gameSnapshot.scoreboard.dire.score}}</div>' +
  ''),
  gameSnapshot : null,
  displayDuration : function() {
    var
    duration = Number(this.get("gameSnapshot.scoreboard.duration")),
    minutes = Math.round(duration / 60),
    seconds = Math.round(duration % 60);
    return minutes + ":" + seconds;
  }.property("view.gameSnapshot.scoreboard.duration", "gameSnapshot.scoreboard.duration"),

  score : function() {
    var
    gameSnapshot = this.get("gameSnapshot"),
    series_type = gameSnapshot.get("series_type"),
    radiant_series_wins = gameSnapshot.get("radiant_series_wins"),
    dire_series_wins = gameSnapshot.get("dire_series_wins");
    //series_type,
    // 0 - no series
    // 1 - bo3
    // 2 - bo5
    return series_type > 0 ? radiant_series_wins + " : " + dire_series_wins : "";
  }.property("view.gameSnapshot.series_type", "gameSnapshot.series_type", "view.gameSnapshot.radiant_series_wins",
             "gameSnapshot.radiant_series_wins", "view.gameSnapshot.dire_series_wins", "gameSnapshot.dire_series_wins"),

  classNames : ["game-time"],
});

});

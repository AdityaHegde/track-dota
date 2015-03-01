define([
  "ember",
  "../../app",
  "ember-utils-core",
  "./feed",
], function(Ember, Dota, Utils) {

var
teamKey = ["radiant", "dire"],
KillDeathObject = Ember.Object.extend({
  player_slot : 0,
  hero_id     : 0,
  team        : 0,
  amt         : 0,
  isOneAmt    : function() {
    return this.get("amt") === 1;
  }.property("amt"),
  playerObj   : function() {
    var
    team = this.get("team"),
    hero_id = this.get("hero_id"),
    gameSnapshot = this.get("parentObj.parentObj.parentObj");
    if(gameSnapshot) {
      var players = gameSnapshot.get("scoreboard." + teamKey[team] + ".players");
      if(teamActual) {
        return players.findBy("hero_id", hero_id);
      }
    }
    return null;
  }.property("hero_id", "team"),
}),
StatChangeObject = Ember.Object.extend({
  netWorthDiff : 0,
  goldDiff     : 0,
}),
DataObject = Ember.Object.extend({
  kills   : Utils.hasMany(KillDeathObject),
  death   : Utils.hasMany(KillDeathObject),
  radiant : Utils.belongsTo(StatChangeObject),
  dire    : Utils.belongsTo(StatChangeObject),
});
Dota.TeamFightObject = Dota.FeedObject.extend({
  viewType : "teamFight",

  data : Utils.belongsTo(DataObject),
});

});

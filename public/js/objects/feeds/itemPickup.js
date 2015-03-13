define([
  "ember",
  "../../app",
  "ember-utils-core",
  "./feed",
], function(Ember, Dota, Utils) {

var
teamKey = ["radiant", "dire"],
PlayerObject = Ember.Object.extend({
  player_slot : 0,
  hero_id     : 0,
  team        : 0,
  playerObj   : function() {
    var
    team = this.get("team"),
    hero_id = this.get("hero_id"),
    gameSnapshot = this.get("parentObj.parentObj.parentObj");
    if(gameSnapshot) {
      var players = gameSnapshot.get("scoreboard." + teamKey[team] + ".players");
      if(players) {
        return players.findBy("hero_id", hero_id);
      }
    }
    return null;
  }.property("hero_id", "team"),

  items       : null,
  itemObjs    : function() {
    var
    items = this.get("items"),
    itemObjs = [];
    if(items) {
      for(var i in items) {
        itemObjs.pushObject(CrudAdapter.GlobalData.items.findBy("item_id", Number(items[i])));
      }
    }
    return itemObjs;
  }.property("items.@each"),
}),
DataObject = Ember.Object.extend({
  players : Utils.hasMany(PlayerObject),
});
Dota.ItemPickupObject = Dota.FeedObject.extend({
  viewType : "itemPickup",

  data : Utils.belongsTo(DataObject),
});


return {
  itemPickup : Dota.ItemPickupObject,
};


});

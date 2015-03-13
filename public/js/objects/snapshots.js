define([
  "ember",
  "../app",
  "ember-utils-core",
  "./dota-objects",
  "./feeds/main",
], function(Ember, Dota, Utils) {


Dota.GameSizeData = {
  MAP_SIZE_X    : 16000,
  MAP_SIZE_Y    : 16000,
  PLAYER_SIZE_X : 32,
  PLAYER_SIZE_Y : 32,
  GRID_SIZE_X   : 800,
  GRID_SIZE_Y   : 800,
  imageSizeX : 600,
  imageSizeY : 600,
};


Dota.PlayerSnapshotObject = Ember.Object.extend({
  init : function() {
    this._super();
    this.itemDidChange();
  },

  player_slot : 0,
  hero_id     : 0,
  heroObj     : function() {
    return Ember.get("CrudAdapter.GlobalData.heroes").findBy("hero_id", this.get("hero_id"));
  }.property("hero_id"),

  position_x  : 0,
  position_y  : 0,

  kills             : 0,
  death             : 0,
  assists           : 0,
  last_hits         : 0,
  denies            : 0,
  gold              : 0,
  level             : 0,
  gold_per_min      : 0,
  xp_per_min        : 0,
  ultimate_state    : 0,
  ultimate_cooldown : 0,

  item0             : 0,
  item1             : 0,
  item2             : 0,
  item3             : 0,
  item4             : 0,
  item5             : 0,
  itemDidChange     : function() {
    var items = [];
    for(var i = 0; i < 6; i++) {
      items.pushObject(CrudAdapter.GlobalData.items.findBy("item_id", this.get("item" + i)) || Dota.ItemObject.create());
    }
    this.set("items", items);
  }.observes("item0", "item1", "item2", "item3", "item4", "item5"),
  items             : null,

  respawn_timer     : 0,
  net_worth         : 0,

  playerPosStyle : function() {
    var
    position_x = Number(this.get("position_x") + Dota.GameSizeData.MAP_SIZE_X / 2) * (Dota.GameSizeData.imageSizeX / Dota.GameSizeData.MAP_SIZE_X) - Dota.GameSizeData.PLAYER_SIZE_X / 2,
    position_y = Number(Dota.GameSizeData.MAP_SIZE_Y / 2 - this.get("position_y")) * (Dota.GameSizeData.imageSizeY / Dota.GameSizeData.MAP_SIZE_Y) - Dota.GameSizeData.PLAYER_SIZE_Y / 2;
    return "top:" + position_y + "px; left:" + position_x + "px;";
  }.property("position_x", "position_y", "Dota.GameSizeData.imageSizeX", "Dota.GameSizeData.imageSizeY"),
});

Dota.TeamSnapshotObject = Ember.Object.extend({
  players : Utils.hasMany(Dota.PlayerSnapshotObject),
});

Dota.ScoreboardObject = Ember.Object.extend({
  radiant : Utils.belongsTo(Dota.TeamSnapshotObject),
  dire    : Utils.belongsTo(Dota.TeamSnapshotObject),
});

Dota.GameSnapshotObject = Ember.Object.extend({
  match_id : 0,
  duration : 0,
  radiant_team : Utils.belongsTo(Dota.TeamObject),
  dire_team    : Utils.belongsTo(Dota.TeamObject),
  scoreboard   : Utils.belongsTo(Dota.ScoreboardObject),

  curFeed : Utils.hasMany(Dota.FeedObjects, "type", ""),
});


});

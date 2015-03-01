define([
  "ember",
  "./app",
  "ember-utils-core",
], function(Ember, Dota, Utils) {

CrudAdapter.APIConfig.API_BASE = "data/v1/api";

Dota.GlobalData = Ember.Object.extend({
});
Dota.GlobalObj = Dota.GlobalData.create();

Dota.Profile = CrudAdapter.createModelWrapper({
  profile_id  : attr(),
  pwd         : attr(),
  displayName : attr(),
  familyName  : attr("string", {defaultValue : ""}),
  givenName   : attr("string", {defaultValue : ""}),
  middleName  : attr("string", {defaultValue : ""}),
  email       : attr(),
}, {
  keys : ['profile_id'],
  apiName : 'profile',
  customApiMap : {
    find : "/user",
    create : "/signup",
  },
  queryParams : ['profile_id'],
  findParams : [],
  serializeFunction : function(record, json) {
    json.displayName = json.givenName + 
                       (json.middleName ? " " + json.middleName : "") +
                       (json.familyName ? " " + json.familyName : "");
  },
});

Dota.TeamObject = Ember.Object.extend({
  team_id      : 0,
  team_name    : "",
  team_tag     : "",
  time_created : 0,
  country_code : "",
  logo         : 0,
  logo_sponsor : 0,
});

Dota.GameSizeData = {
  MAP_SIZE_X    : 16000,
  MAP_SIZE_Y    : 16000,
  PLAYER_SIZE_X : 20,
  PLAYER_SIZE_Y : 20,
  imageSizeX : 600,
  imageSizeY : 600,
};

Dota.HeroObject = Ember.Object.extend({
  hero_id         : 0,
  hero_name       : "",

  hero_name_base  : function() {
    var hero_name = this.get("hero_name");
    return hero_name.replace("npc_dota_hero_", "");
  }.property("hero_name"),

  hero_local_name : "",

  /*hero_icon       : function() {
    var hero_local_name = this.get("hero_local_name");
    hero_local_name = hero_local_name.replace(/ /g, "_");
    return "http://hydra-media.cursecdn.com/dota2.gamepedia.com/2/26/" + hero_local_name + "_icon.png";
  }.property("hero_local_name"),*/
  hero_minimap_icon : "http://hydra-media.cursecdn.com/dota2.gamepedia.com/2/26/Abaddon_icon.png?version=e6ef2579c9365ec669b25a66d0934860",

  hero_icon         : function() {
    var hero_name_base = this.get("hero_name_base");
    return "http://cdn.dota2.com/apps/dota2/images/heroes/" + hero_name_base + "_sb.png";
  }.property("hero_name_base"),

  hero_potrait      : function() {
    var hero_name_base = this.get("hero_name_base");
    return "http://cdn.dota2.com/apps/dota2/images/heroes/" + hero_name_base + "_full.png";
  }.property("hero_name_base"),
});

Dota.ItemObject = Ember.Object.extend({
  item_id         : 0,
  item_name       : 0,
  item_local_name : 0,
  cost            : 0,
  secret_shop     : 0,
  side_shop       : 0,
  recipe          : 0,

  itemIcon        : function() {
    var item_name = this.get("item_name");
    return "http://cdn.dota2.com/apps/dota2/images/items/" + item_name + "_lg.png";
  }.property("item_name"),
});


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
});


});

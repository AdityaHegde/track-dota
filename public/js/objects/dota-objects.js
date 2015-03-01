define([
  "ember",
  "../app",
  "ember-utils-core",
], function(Ember, Dota, Utils) {

Dota.TeamObject = Ember.Object.extend({
  team_id      : 0,
  team_name    : "",
  team_tag     : "",
  time_created : 0,
  country_code : "",
  logo         : 0,
  logo_sponsor : 0,
});


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


});

define([
  "ember",
  "../app",
  "ember-utils",
], function(Ember, Dota) {

Dota.PlayerStatsController = ArrayMod.ArrayModController.extend({
  init : function() {
    this._super();
    this.set("arrayMods", []);
    //this.statViewDidChange();
  },

  unique_id : "playerStats",

  statView : "cs",
  statViewDidChange : function() {
    var
    statView = this.get("statView"),
    arrayMods = this.get("arrayMods");
    arrayMods.clear();
    arrayMods.pushObjects(this.get(statView + "SortMod"));
  }.observes("statView"),

  statViews : [{
    viewName : "kda",
    viewLabel : "KDA",
  }, {
    viewName : "cs",
    viewLabel : "Creep Stats",
  }, {
    viewName : "level",
    viewLabel : "Level",
  }, {
    viewName : "networth",
    viewLabel : "Networth",
  }],

  kdaSortMod : [
    ArrayMod.ArraySortModifier.create({
      property : "kills",
      order : false,
    }),
    ArrayMod.ArraySortModifier.create({
      property : "assists",
      order : false,
    }),
    ArrayMod.ArraySortModifier.create({
      property : "deaths",
    }),
  ],
  csSortMod : [
    ArrayMod.ArraySortModifier.create({
      property : "last_hits",
      order : false,
    }),
    ArrayMod.ArraySortModifier.create({
      property : "denies",
      order : false,
    }),
  ],
  levelSortMod : [
    ArrayMod.ArraySortModifier.create({
      property : "level",
      order : false,
    }),
  ],
  networthSortMod : [
    ArrayMod.ArraySortModifier.create({
      property : "net_worth",
      order : false,
    }),
  ],
});

});

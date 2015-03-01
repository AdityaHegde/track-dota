define([
  "ember",
  "../../app",
  "ember-utils-core",
  "./feed",
], function(Ember, Dota, Utils) {

var
TeamObject = Ember.Object.extend({
  towers   : 0,
  barracks : 0,
}),
DataObject = Ember.Object.extend({
  radiant : Utils.belongsTo(TeamObject),
  dire    : Utils.belongsTo(TeamObject),
});
Dota.BuildingDestroyedObject = Dota.FeedObject.extend({
  viewType : "buildingDestroyed",

  data : Utils.belongsTo(DataObject),
});

});

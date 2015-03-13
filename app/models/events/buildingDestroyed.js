var 
mongoose = require("mongoose"),
buildingDestroyedSchema = mongoose.Schema({
  team      : Number,
  team_id   : Number,
  type      : Number,
  subtype   : Number,
  duration  : Number,
}),
buildingDestroyed = mongoose.model('BuildingDestroyed', buildingDestroyedSchema);

buildingDestroyed.searchAttr = ["team", "team_id", "type", "subtype"];
buildingDestroyed.queryParam = ["team", "team_id", "type", "subtype"];

module.exports = buildingDestroyed;

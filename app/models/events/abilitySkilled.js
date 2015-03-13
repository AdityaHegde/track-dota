var 
mongoose = require("mongoose"),
abilitySkilledSchema = mongoose.Schema({
  ability_id    : Number,
  ability_level : Number,
  duration      : Number,

  hero_id       : Number,
  team          : Number,
  account_id    : Number,
  team_id       : Number,
}),
abilitySkilled = mongoose.model('AbilitySkilled', abilitySkilledSchema);

abilitySkilled.searchAttr = ["ability_id"];
abilitySkilled.queryParam = ["ability_id"];

module.exports = abilitySkilled;

var 
mongoose = require("mongoose"),
abilitySchema = mongoose.Schema({
  ability_id : String,
  name       : String,
  img        : String,
  desc       : String,

  isUlti     : Boolean,
  isPassive  : Boolean,

  cooldowns  : [String],
}),
heroSchema = mongoose.Schema({
  hero_id    : String,
  name       : String,
  imgSmall   : String,
  imgLarge   : String,

  attackType : String,
  roles      : [String],
  int        : String,
  agi        : String,
  str        : String,
  dam        : String,
  spd        : String,
  arm        : String,

  abilities  : [abilitySchema],
}),
hero = mongoose.model('Hero', heroSchema);

hero.searchAttr = "hero_id";
hero.queryParam = "hero_id";

module.exports = hero;

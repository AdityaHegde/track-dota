var 
mongoose = require("mongoose"),
abilitySchema = mongoose.Schema({
  ability_id   : Number,
  ability_name : String,
  /*img          : String,
  desc         : String,

  isUlti       : Boolean,
  isPassive    : Boolean,

  cooldowns    : [String],*/
  //http://media.steampowered.com/apps/dota2/images/abilities/<hero name>_<ability name>_hp1.png
}),
ability = mongoose.model('Ability', abilitySchema);

ability.searchAttr = ["ability_id"];
ability.queryParam = ["ability_id"];
ability.apiFeed = {
  host : "raw.githubusercontent.com",
  path : "/kronusme/dota2-api/master/data/abilities.json",
  resultBase : "abilities",
  resultKeysToData : {
    ability_id   : "id",
    ability_name : "name",
  },
  isStatic : true,
};

module.exports = ability;

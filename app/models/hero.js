var 
mongoose = require("mongoose"),
heroSchema = mongoose.Schema({
  hero_id           : Number,
  hero_name         : String,
  hero_local_name   : String,
}),
hero = mongoose.model('Hero', heroSchema);

hero.searchAttr = ["hero_id"];
hero.queryParam = ["hero_id"];
hero.apiFeed = {
  host : "api.steampowered.com",
  path : "/IEconDOTA2_570/GetHeroes/V001/?key=<apiKey>&language=en",
  resultBase : "result.heroes",
  resultKeysToData : {
    hero_id : "id",
    hero_name : "name",
    hero_local_name : "localized_name",
  },
  isStatic : true,
};

module.exports = hero;

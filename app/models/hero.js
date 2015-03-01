var 
mongoose = require("mongoose"),
heroSchema = mongoose.Schema({
  hero_id           : Number,
  hero_name         : String,
  hero_local_name   : String,
  //hero_minimap_icon : String,
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
  /*processKeysOnRecord : {
    hero_minimap_icon : {
      type           : "readFromFile",
      getKey         : "",
      model          : "hero",
      key            : "hero_minimap_icon",
      fileName       : "./dota2_minimap_icons.csv",
      rowsRegex      : /\n/,
      partsRegex     : /^([a-zA-Z\- ']*?)\s*,"(.*?)"/,
      partsKeys      : ["dummy", "hero_local_name", "hero_minimap_icon"],
      mapValIdx      : 1,
      searchValueKey : "hero_local_name",
    },
  },*/
  isStatic : true,
};

module.exports = hero;

var 
mongoose = require("mongoose"),
playerSchema = mongoose.Schema({
  steamid      : String,
  personaname  : String,
  avatar       : String,
}),
player = mongoose.model('Player', playerSchema);

player.searchAttr = ["player_id"];
player.queryParam = ["player_id"];
player.apiFeed = {
  host : "api.splayerpowered.com",
  path : "/isplayeruser/getplayersummaries/v0002/?key=<apiKey>&splayerids=<playerIds>",
  resultBase : "response.players",
  resultKeysToData : {
    steamid      : "steamid",
    personaname  : "personaname",
    avatar       : "avatar",
  },
  isStatic : true,
};

module.exports = player;

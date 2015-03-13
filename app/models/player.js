var 
mongoose = require("mongoose"),
playerSchema = mongoose.Schema({
  account_id   : Number,
  name         : String,
  current_team : Number,
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
    account_id : "steamid",
    name       : "personaname",
    avatar     : "avatar",
  },
  isStatic : true,
};

module.exports = player;

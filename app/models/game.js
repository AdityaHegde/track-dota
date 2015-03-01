var 
mongoose = require("mongoose"),
gameSchema = mongoose.Schema({
  lobby_id : String,
  match_id : String,
  duration : Number,
  fullData : mongoose.Schema.Types.Mixed,
}),
game = mongoose.model('Game', gameSchema);

game.searchAttr = ["match_id"];
game.queryParam = ["match_id", "duration"];
game.apiFeed = {
  host : "api.steampowered.com",
  path : "/IDOTA2Match_570/GetLiveLeagueGames/v001?key=<apiKey>",
  resultBase : "result.games",
  resultKeysToData : {
    lobby_id : "lobby_id",
    match_id : "match_id",
    duration : "scoreboard.duration",
    fullData : "",
  },
  isStatic : false,
};

module.exports = game;

var 
mongoose = require("mongoose"),
Team = require("./team"),
Player = require("./player"),
League = require("./league"),
gameSchema = mongoose.Schema({
  match_id       : String,
  league         : {
    type : mongoose.Schema.Types.ObjectId,
    ref  : League,
  },
  league_tier    : Number,
  server_version : Number,

  radiant        : {
    type : mongoose.Schema.Types.ObjectId,
    ref  : Team,
  },
  dire           : {
    type : mongoose.Schema.Types.ObjectId,
    ref  : Team,
  },
  players        : [{
    type : mongoose.Schema.Types.ObjectId,
    ref  : Player,
  }],
  winning_side   : Number,

  radiant_series_wins : Number,
  dire_series_wins    : Number,
  series_type         : Number,
}),
game = mongoose.model('Game', gameSchema);

game.searchAttr = ["match_id"];
game.queryParam = ["match_id"];

module.exports = game;

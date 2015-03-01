var 
mongoose = require("mongoose"),
team = require("./team"),
pickBanSchema = mongoose.Schema({
  hero_id : Number,
}),
playerSnapshotSchema = mongoose.Schema({
  player_slot       : Number,
  account_id        : Number,
  hero_id           : Number,
  kills             : Number,
  death             : Number,
  assists           : Number,
  last_hits         : Number,
  denies            : Number,
  gold              : Number,
  level             : Number,
  gold_per_min      : Number,
  xp_per_min        : Number,
  ultimate_state    : Number,
  ultimate_cooldown : Number,
  item0             : Number,
  item1             : Number,
  item2             : Number,
  item3             : Number,
  item4             : Number,
  item5             : Number,
  respawn_timer     : Number,
  position_x        : Number,
  position_y        : Number,
  net_worth         : Number,
}),
teamScoreboardSchema = {
  score          : Number,
  tower_state    : Number,
  barracks_state : Number,
  picks          : [pickBanSchema],
  bans           : [pickBanSchema],
  players        : [playerSnapshotSchema],
  abilities      : [{
    ability_id    : Number,
    ability_level : Number,
  }],
},
feedSchema = mongoose.Schema({
  type : String,
  data : {},
}),
gameSnapshotSchema = mongoose.Schema({
  lobby_id : Number,
  match_id : Number,
  radiant_team : {
    type : mongoose.Schema.Types.ObjectId,
    reg  : "Team",
  },
  dire_team    : {
    type : mongoose.Schema.Types.ObjectId,
    reg  : "Team",
  },
  scoreboard   : {
    duration             : Number,
    roshan_respawn_timer : Number,
    radiant              : teamScoreboardSchema,
    dire                 : teamScoreboardSchema,
  },
  series_type         : Number,
  radiant_series_wins : Number,
  dire_series_wins    : Number,
  league_tier         : Number,
  spectators          : Number,
  stream_delay_s      : Number,
  curFeed             : [feedSchema],
}),
gameSnapshot = mongoose.model('GameSnapshot', gameSnapshotSchema);

gameSnapshot.searchAttr = ["match_id"];
gameSnapshot.queryParam = ["match_id", "duration"];
gameSnapshot.apiFeed = {
  host : "api.steampowered.com",
  path : "/IDOTA2Match_570/GetLiveLeagueGames/v001?key=<apiKey>",
  resultBase : "result.games",
  useFullResult : true,
  incrementalBy : "match_id",
  ignoreKeysForDiff : {
    curFeed : 1,
  },
  processKeysOnRecord : {
    dire_team    : {
      type   : "getDataCreateIfNotPresent",
      getKey : "dire_team",
      model  : "team",
      key    : "_id",
      params : ["team_id"],
    },
    radiant_team : {
      type   : "getDataCreateIfNotPresent",
      getKey : "radiant_team",
      model  : "team",
      key    : "_id",
      params : ["team_id"],
    },
    curFeed      : {
      type   : "extractFeed",
      getKey : "",
      model  : "game",
      key    : "",
      canBeNull : true,
    },
  },
  isStatic : false,
};

module.exports = gameSnapshot;

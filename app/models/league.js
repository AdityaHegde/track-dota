var 
mongoose = require("mongoose"),
leagueSchema = mongoose.Schema({
  league_id      : Number,
  league_name    : String,
  tournament_url : String,
  league_desc    : String,
  itemdef        : Number,
}),
league = mongoose.model('League', leagueSchema);

league.searchAttr = ["league_id"];
league.queryParam = ["league_id"];
league.apiFeed = {
  host : "api.steampowered.com",
  path : "/IDOTA2Match_570/GetLeagueListing/v1/?key=<apiKey>&language=en",
  resultBase : "result.leagues",
  resultKeysToData : {
    league_id      : "leagueid",
    league_name    : "name",
    tournament_url : "tournament_url",
    league_desc    : "description",
    itemdef        : "itemdef",
  },
  isStatic : true,
};

module.exports = league;

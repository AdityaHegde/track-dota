var 
mongoose = require("mongoose"),
teamSchema = mongoose.Schema({
  team_id      : Number,
  team_name    : String,
  team_tag     : String,
  time_created : Number,
  logo         : Number,
  logo_sponsor : Number,
  country_code : String,
}),
team = mongoose.model('Team', teamSchema);

team.searchAttr = ["team_id"];
team.queryParam = ["team_id"];
team.apiFeed = {
  host : "api.steampowered.com",
  path : "/ISteamRemoteStorage/GetUGCFileDetails/v1/?key=<apiKey>&appid=570&ugcid=<logo>",
  resultBase : "result.teams",
  resultKeysToData : {
    team_id      : "team_id",
    team_name    : "name",
    team_tag     : "tag",
    time_created : "time_created",
    logo         : "logo",
    logo_sponsor : "logo_sponsor",
    country_code : "country_code",
  },
  isStatic : true,
};

module.exports = team;

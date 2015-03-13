var 
mongoose = require("mongoose"),
teamSchema = mongoose.Schema({
  team_id      : Number,
  team_name    : String,
  team_tag     : String,
  time_created : Number,
  logo         : Number,
  //logo_imgae   : String,
  logo_sponsor : Number,
  country_code : String,
}),
team = mongoose.model('Team', teamSchema);

team.searchAttr = ["team_id"];
team.queryParam = ["team_id"];
team.apiFeed = {
  host : "api.steampowered.com",
  path : "/IDOTA2Match_570/GetTeamInfoByTeamID/v1/?key=<apiKey>&start_at_team_id=<team_id>&teams_requested=1",
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
  /*processKeysOnRecord : {
    logo_imgae : {
      type   : "getDataCreateIfNotPresent",
      getKey : "",
      model  : "teamLogo",
      key    : "url",
      params : ["logo"],
    },
  },*/
  isStatic : true,
};

module.exports = team;

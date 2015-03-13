var 
mongoose = require("mongoose"),
teamLogoSchema = mongoose.Schema({
  filename : String,
  url      : String,
}),
teamLogo = mongoose.model('TeamLogo', teamLogoSchema);

teamLogo.searchAttr = ["filename"];
teamLogo.queryParam = ["filename"];
teamLogo.apiFeed = {
  host : "api.steampowered.com",
  path : "/ISteamRemoteStorage/GetUGCFileDetails/v1/?key=<apiKey>&appid=570&ugcid=<logo>",
  resultBase : "result.data",
  resultKeysToData : {
    filename : "filename",
    url      : "url",
  },
  isStatic : true,
};

module.exports = teamLogo;

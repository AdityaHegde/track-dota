var 
mongoose = require("mongoose"),
kdaSchema = mongoose.Schema({
  match_id   : Number,
  type       : Number,
  duration   : Number,
  amt        : Number,

  hero_id    : Number,
  team       : Number,
  account_id : Number,
  team_id    : Number,
}),
kda = mongoose.model('KDA', kdaSchema);

kda.searchAttr = ["type"];
kda.queryParam = ["type"];

module.exports = kda;

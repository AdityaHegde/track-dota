var 
mongoose = require("mongoose"),
itemPickupSchema = mongoose.Schema({
  match_id    : Number,
  item_id     : Number,
  duration    : Number,

  hero_id     : Number,
  team        : Number,
  account_id  : Number,
  team_id     : Number,
}),
itemPickup = mongoose.model('ItemPickup', itemPickupSchema);

itemPickup.searchAttr = ["item_id"];
itemPickup.queryParam = ["item_id"];

module.exports = itemPickup;

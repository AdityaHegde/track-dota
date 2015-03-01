var 
mongoose = require("mongoose"),
itemSchema = mongoose.Schema({
  item_id         : Number,
  item_name       : String,
  cost            : Number,
  secret_shop     : Number,
  side_shop       : Number,
  recipe          : Number,
  item_local_name : String,
}),
item = mongoose.model('Item', itemSchema);

item.searchAttr = ["item_id"];
item.queryParam = ["item_id"];
item.apiFeed = {
  host : "api.steampowered.com",
  path : "/IEconDOTA2_570/GetGameItems/V001/?key=<apiKey>&language=en",
  resultBase : "result.items",
  resultKeysToData : {
    item_id         : "id",
    item_name       : "name",
    cost            : "cost",
    secret_shop     : "secret_shop",
    side_shop       : "side_shop",
    recipe          : "recipe",
    item_local_name : "localized_name",
  },
  isStatic : true,
};

module.exports = item;

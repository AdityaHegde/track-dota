var
Hero = require("../models/hero"),
Ability = require("../models/ability"),
Item = require("../models/item");

module.exports = function(callback) {
  var
  rc = 0,
  data = {},
  returnData = function() {
    rc++;
    if(rc === 3) {
      callback(null, data);
    }
  };

  Hero.find({}, function(err, heroes) {
    data.heroes = heroes;
    returnData();
  });
  Ability.find({}, function(err, abilities) {
    data.abilities = abilities;
    returnData();
  });
  Item.find({}, function(err, items) {
    data.items = items;
    returnData();
  });
};

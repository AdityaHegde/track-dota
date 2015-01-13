var
hero_list = require("./hero_list"),
mongodb_data_adaptor = require("../mongodb_data_adaptor");

mongodb_data_adaptor.init({
  "hero" : "../models/hero",
});

hero_list(function(err, heros) {
  var called = heros.length;
  for(var i = 0; i < heros.length; i++) {
    mongodb_data_adaptor.create_or_update("hero", heros[i], function(err, hero) {
      called--;
      if(err) {
        console.log(err);
      }
      else {
        console.log("Hero was created - "+called);
        //console.log(hero);
      }
    }, 1);
  }
});

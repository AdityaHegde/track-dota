var
parser = require("./parser"),
hero_details = require("./hero_details");

module.exports = function(callback) {
  parser({
    url : "http://www.dota2.com/heroes/",
    selector : ".heroIcons",
  }, function(err, res) {
    if(err) {
      callback(err);
    }
    else {
      var
      heroesDivs = res.children(),
      heroes = [],
      called = heroesDivs.length;
      for(var i = 0; i < heroesDivs.length; i++) {
        (function() {
          var 
          heroDiv = heroesDivs[i],
          id = heroDiv.getAttribute("id"),
          idMatched = id.match(/^link_(.*)$/),
          images = heroDiv.getElementsByTagName("img"),
          imgLarge = images[0].getAttribute("src"),
          imgSmall = images[1].getAttribute("src"),
          detailPage = heroDiv.getAttribute("href");

          hero_details({
            url : detailPage,
          }, function(err, hero) {
            if(!err) {
              hero.hero_id  = idMatched ? idMatched[1] : id;
              hero.imgSmall = imgSmall;
              hero.imgLarge = imgLarge;
              heroes.push(hero);
            }
            called--;
            if(called === 0) {
              callback(null, heroes);
            }
          });
        })()
      }
    }
  });
};

/*module.exports(function(err, heros) {
  console.log(heros.length);
});*/

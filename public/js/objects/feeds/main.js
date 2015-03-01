define([
  "../../app",
  "./buildingDestroyed",
  "./feed",
  "./itemPickup",
  "./teamFight",
], function(Dota) {
  Dota.FeedObjects = {};

  for(var i = 1; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      Dota.FeedObjects[k] = arguments[i][k];
    }
  }
});

//   /\s*\([a-zA-Z]*\)\.js/  ".\/\1",\r/gc

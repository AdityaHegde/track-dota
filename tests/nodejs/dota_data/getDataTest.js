var
proxyquire = require("proxyquire").noCallThru(),
modelProxy = require("./lib/modelProxy"),
httpsMock = require("./lib/httpsMock"),
httpsMockOpts = {data : []},
httpsMockObj = new httpsMock(httpsMockOpts),
proxys = {
  "gameSnapshot"      : new modelProxy({primaryKey : "match_id"}),
  "hero"              : new modelProxy({primaryKey : "hero_id"}),
  "ability"           : new modelProxy({primaryKey : "ability_id"}),
  "item"              : new modelProxy({primaryKey : "item_id"}),
  "league"            : new modelProxy({primaryKey : "league_id"}),
  "team"              : new modelProxy({primaryKey : "team_id"}),
  "player"            : new modelProxy({primaryKey : "account_id"}),
  "itemPickup"        : new modelProxy(),
  "kda"               : new modelProxy(),
  "buildingDestroyed" : new modelProxy(),
  "abilitySkilled"    : new modelProxy(),
},
models = {
  "gameSnapshot"      : require("../../../app/models/gameSnapshot"),
  "hero"              : require("../../../app/models/hero"),
  "ability"           : require("../../../app/models/ability"),
  "item"              : require("../../../app/models/item"),
  "league"            : require("../../../app/models/league"),
  "team"              : require("../../../app/models/team"),
  "player"            : require("../../../app/models/player"),
  "itemPickup"        : require("../../../app/models/events/itemPickup"),
  "kda"               : require("../../../app/models/events/kda"),
  "buildingDestroyed" : require("../../../app/models/events/buildingDestroyed"),
  "abilitySkilled"    : require("../../../app/models/events/abilitySkilled"),
},
getData = proxyquire("../../../app/dota_data/getData", {
  "../../models/gameSnapshot"             : proxys.gameSnapshot,
  "../../models/hero"                     : proxys.hero,
  "../../models/ability"                  : proxys.ability,
  "../../models/item"                     : proxys.item,
  "../../models/league"                   : proxys.league,
  "../../models/team"                     : proxys.team,
  "../../models/player"                   : proxys.player,
  "../../models/events/itemPickup"        : proxys.itemPickup,
  "../../models/events/kda"               : proxys.kda,
  "../../models/events/buildingDestroyed" : proxys.buildingDestroyed,
  "../../models/events/abilitySkilled"    : proxys.abilitySkilled,

  "./getDataFromAPI" : proxyquire("../../../app/dota_data/getData/getDataFromAPI", {
    "https" : httpsMockObj,
  }),
}).getData,
assert = require("assert"),
deepKeys = require("deep-keys-lib"),
getDataTestData = require("./getDataTestData");

for(var m in models) {
  proxys[m].apiFeed = models[m].apiFeed;
  proxys[m].queryParam = models[m].queryParam;
  proxys[m].searchAttr = models[m].searchAttr;
}

describe("getData", function() {
  var meta = {};
  for(var i = 0; i < getDataTestData.length; i++) {
    (function() {
      var
      test = getDataTestData[i],
      params = {
        apiKey : "12345",
      };
      it(test.title, function(done) {
        httpsMockOpts.data = test.data;
        getData(test.modelName, params, meta, function(err, results) {
          if(err) {
            done(err);
          }
          else {
            try {
              //console.log(JSON.stringify(deepKeys.diff(results, test.results, {})));
              //console.log(JSON.stringify(deepKeys.diff(test.results, results, {})));
              //assert.deepEqual(results, test.results);
              assert.equal(deepKeys.diff(results, test.results, {}) && deepKeys.diff(test.results, results, {}));
              done();
            } catch(err) {
              done(err);
            }
          }
        });
      });
    })();
  }
});

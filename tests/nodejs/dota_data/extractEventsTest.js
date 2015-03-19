var
proxyquire = require("proxyquire").noCallThru(),
modelProxy = require("./lib/modelProxy"),
extractEvents = proxyquire("../../../app/dota_data/getData/extractEvents", {
  "../../models/events/itemPickup"        : new modelProxy(),
  "../../models/events/kda"               : new modelProxy(),
  "../../models/events/buildingDestroyed" : new modelProxy(),
  "../../models/events/abilitySkilled"    : new modelProxy(),
}),
readFile = require("fs").readFile,
assert = require("assert"),
extractEventsTestData = require("./extractEventsTestData");

describe("extractEvents", function() {
  for(var i = 0; i < extractEventsTestData.length; i++) {
    (function() {
      var
      test = extractEventsTestData[i];
      it(test.title, function(done) {
        extractEvents(test.last, test.cur, function(events) {
          try {
            //console.log(events);
            assert.deepEqual(events, test.events);
            done();
          } catch(err) {
            done(err);
          }
        }, function(err) {
          done(err);
        });
      });
    })();
  }
});

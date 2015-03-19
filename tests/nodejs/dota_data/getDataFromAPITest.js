var
proxyquire = require("proxyquire").noCallThru(),
httpsMock = require("./lib/httpsMock"),
httpsMockObj = new httpsMock({
  data : {
    "test.com/test/path?a=b" : [
      '{"a" : [',
      '{"a" : 1},',
      '{"a" : 2},',
      '{"a" : 3},',
      '{"a" : 4},',
      '{"a" : 5}]}',
    ],
  },
}),

getDataFromAPI = proxyquire("../../../app/dota_data/getData/getDataFromAPI", {
  "https" : httpsMockObj,
}),

assert = require("assert");

describe("getDataFromAPI", function() {
  it("sanity test", function(done) {
    getDataFromAPI({
      host : "test.com",
      path : "/test/path?a=b",
    }, {
    }, {}).then(function(data) {
      try {
        assert.deepEqual(data, {
          a : [
            {a : 1},
            {a : 2},
            {a : 3},
            {a : 4},
            {a : 5}
          ],
        });
        done();
      } catch (err) {
        done(err);
      }
    }, function(err) {
      done(err);
    });
  });

  it("cahce test", function(done) {
    httpsMockObj.callCounter = 0;
    var
    dataReturned = 0,
    meta = {},
    callDone = function() {
      dataReturned++;
      if(dataReturned === 5) {
        try {
          assert.equal(httpsMockObj.callCounter, 1);
          done();
        } catch(err) {
          done(err);
        }
      }
    };
    for(var i = 0; i < 5; i++) {
      getDataFromAPI({
        host : "test.com",
        path : "/test/path?a=b",
      }, {}, meta).then(function(data) {
        try {
          assert.deepEqual(data, {
            a : [
              {a : 1},
              {a : 2},
              {a : 3},
              {a : 4},
              {a : 5}
            ],
          });
          callDone();
        } catch (err) {
          done(err);
        }
      }, function(err) {
        done(err);
      });
    }
  });
});

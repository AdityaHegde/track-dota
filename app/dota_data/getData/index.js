var
https = require("https"),
mongoose = require("mongoose"),
Promise = require("promise2").Promise,
PromiseTracker = require("promise2").PromiseTracker,
deepKeys = require("deep-keys-lib"),
mongodbAPI = require("../../lib/mongodbAPI"),
extractFeed = require("./extractFeed"),
readFromFile = require("./readFromFile"),
models = {
  game    : require("../../models/gameSnapshot"),
  hero    : require("../../models/hero"),
  ability : require("../../models/ability"),
  item    : require("../../models/item"),
  league  : require("../../models/league"),
  team    : require("../../models/team"),
  player  : require("../../models/player"),
};

mongodbAPI.init(models);

var methods = {

  getData : function(modelName, params, meta, callback) {
    var
    model = models[modelName],
    tracker = new PromiseTracker(),
    dataArr = [];

    methods.getDataFromAPI(model, params, tracker, 0).then(function(data) {
      data = deepKeys.getValue(data, model.apiFeed.resultBase) || [];
      for(var i = 0; i < data.length; i++) {
        (function() {
          var
          obj = data[i],
          rec = {},
          idx = i;
          if(model.apiFeed.useFullResult) {
            rec = obj;
          }
          else if(model.apiFeed.resultKeysToData) {
            for(var k in model.apiFeed.resultKeysToData) {
              deepKeys.assignValue(rec, k, deepKeys.getValue(obj, model.apiFeed.resultKeysToData[k]));
            }
          }
          new Promise(function(resolve, reject) {
            //console.log("in promise");
            var
            tr = new PromiseTracker();
            for(var k in model.apiFeed.processKeysOnRecord) {
              (function() {
                var
                _k = k,
                v = deepKeys.getValue(rec, model.apiFeed.processKeysOnRecord[_k].getKey);
                if(model.apiFeed.processKeysOnRecord[_k].canBeNull || (v !== null && v !== undefined)) {
                  //console.log("1 ** " + idx);
                  methods[model.apiFeed.processKeysOnRecord[_k].type](v, model.apiFeed.processKeysOnRecord[_k], params, meta, tr, 1).then(function(prec) {
                    if(prec) {
                      var
                      _kv = deepKeys.getValue(prec, model.apiFeed.processKeysOnRecord[_k].key);
                      //console.log("2 ** " + idx + " ** " + _kv);
                      deepKeys.assignValue(rec, _k, _kv);
                      //console.log(rec[_k]);
                    }
                    else {
                      console.log(rec);
                    }
                  }, function(err) {
                    console.log(err);
                  });
                }
              })();
            }
            new Promise(function(resolve, reject) {
              if(model.apiFeed.incrementalBy) {
                if(!meta.incrementalMeta) {
                  meta.incrementalMeta = {};
                }
                var
                incrementalByVal = deepKeys.getValue(rec, model.apiFeed.incrementalBy),
                prevIncrementalObj = meta.incrementalMeta[incrementalByVal];
                meta.incrementalMeta[incrementalByVal] = rec;
                if(prevIncrementalObj) {
                  rec = deepKeys.diff(prevIncrementalObj, rec, model.apiFeed.ignoreKeysForDiff || {});
                  if(rec !== undefined) {
                    for(var i = 0; i < model.searchAttr.length; i++) {
                      deepKeys.assignValue(rec, model.searchAttr[i], deepKeys.getValue(prevIncrementalObj, model.searchAttr[i]));
                    }
                  }
                }
              }
              //console.log(JSON.stringify(rec));
              //console.log("3 ** " + idx);
              if(rec !== undefined) {
                mongodbAPI.create(modelName, rec, function(err, rec) {
                  if(err) {
                    reject(err);
                  }
                  else {
                    dataArr.push(rec);
                    resolve();
                  }
                });
              }
              else {
                resolve();
              }
            }, tr, 0);
            new Promise(function(rs, rj) {
              rs();
              resolve();
            }, tr, 0);
          }, tracker, 1);
        })();
      }
      new Promise(function(resolve, reject) {
        //console.log("Call end");
        callback(null, dataArr);
        resolve();
      }, tracker, 0);
    });
  },

  getDataCreateIfNotPresent : function(rec, config, params, meta, tracker, type) {
    return new Promise(function(resolve, reject) {
      mongodbAPI.get(config.model, rec, function(err, r) {
        if(err) {
          reject(err);
        }
        else if(!r) {
          var p = {
            apiKey : params.apiKey,
          };
          for(var i = 0; i < config.params.length; i++) {
            deepKeys.assignValue(p, config.params[i], deepKeys.getValue(rec, config.params[i]));
          }
          methods.getData(config.model, p, {}, function(err, r) {
            resolve(r && r[0]);
          });
        }
        else {
          resolve(r);
        }
      });
    }, tracker, type);
  },

  getDataFromAPI : function(model, params, tracker, type) {
    return new Promise(function(resolve, reject) {
      var
      host = deepKeys.replaceKeys(model.apiFeed.host, params),
      path = deepKeys.replaceKeys(model.apiFeed.path, params);
      console.log("call made " + host + path);
      https.request({
        host : host,
        path : path,
      }, function(res) {
        var str = "";
        res.on("data", function(chunk) {
          str += chunk;
        });
        res.on("end", function() {
          try {
            resolve(JSON.parse(str));
          } catch(e) {
            reject(e);
          }
        });
      }).end();
    }, tracker, type);
  },

  createOrUpdateRec : function(modelName, rec, tracker, type) {
    return new Promise(function(resolve, reject) {
      //console.log("create/update");
      mongodbAPI.create_or_update(modelName, rec, function(err, rec) {
        if(err) {
          reject(err);
        }
        else {
          resolve(rec);
        }
      });
    }, tracker, type);
  },

  extractFeed : function(rec, config, params, meta, tracker, type) {
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        if(!rec || !meta.incrementalMeta || !meta.incrementalMeta[rec.match_id]) {
          resolve([]);
        }
        else {
          var
          prevIncrementalObj = meta.incrementalMeta[rec.match_id],
          feed = extractFeed(prevIncrementalObj, rec);
          resolve(feed);
        }
      }, 10);
    }, tracker, type);
  },

  readFromFile : function(rec, config, params, meta, tracker, type) {
    return new Promise(function(resolve, reject) {
      readFromFile(config, rec).then(function(val) {
        resolve(val);
      });
    }, tracker, type);
  },
};

module.exports = methods;

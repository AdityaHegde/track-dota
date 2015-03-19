var
https          = require("https"),
mongoose       = require("mongoose"),
Promise        = require("promise2").Promise,
PromiseTracker = require("promise2").PromiseTracker,
deepKeys       = require("deep-keys-lib"),

mongodbAPI     = require("../../lib/mongodbAPI"),

extractEvents    = require("./extractEvents"),
readFromFile     = require("./readFromFile"),
correctAbilities = require("./correctAbilities"),
getDataFromAPI   = require("./getDataFromAPI"),

models = {
  game    : require("../../models/gameSnapshot"),
  hero    : require("../../models/hero"),
  ability : require("../../models/ability"),
  item    : require("../../models/item"),
  league  : require("../../models/league"),
  team    : require("../../models/team"),
  player  : require("../../models/player"),
},
teams = ["radiant", "dire"];

mongodbAPI.init(models);

var methods = {

  getData : function(modelName, params, meta, callback) {
    var
    model = models[modelName],
    tracker = new PromiseTracker(),
    dataArr = [];

    getDataFromAPI(model.apiFeed, params, meta).then(function(data) {
      data = deepKeys.getValue(data, model.apiFeed.resultBase) || [];
      if(data && !data.length) {
        data = [data];
      }
      if(modelName === "game") {
        //temporary fix for abilities returned at the wrong place
        //correctAbilities(meta.rawResult, data, meta.abilitiesMap);
      }
      for(var i = 0; i < data.length; i++) {
        tracker.addAsyncNonBlocking(function(obj, idx) {
          var rec = {};
          if(model.apiFeed.useFullResult) {
            rec = obj;
          }
          else if(model.apiFeed.resultKeysToData) {
            for(var k in model.apiFeed.resultKeysToData) {
              deepKeys.assignValue(rec, k, deepKeys.getValue(obj, model.apiFeed.resultKeysToData[k]));
            }
            //console.log(rec);
          }
          if(modelName === "game") {
            console.log("duration");
            console.log(rec.scoreboard.duration);
          }
          return new Promise(function(resolve, reject) {
            //console.log("in promise ** " + idx);
            var
            tr = new PromiseTracker();
            for(var k in model.apiFeed.processKeysOnRecord) {
              (function() {
                var
                _k = k,
                v = deepKeys.getValue(rec, model.apiFeed.processKeysOnRecord[_k].getKey);
                if(model.apiFeed.processKeysOnRecord[_k].canBeNull || (v !== null && v !== undefined)) {
                  //console.log("1 ** " + idx);
                  tr.addAsyncNonBlocking(methods[model.apiFeed.processKeysOnRecord[_k].type], v, model.apiFeed.processKeysOnRecord[_k], params, meta, tr).then(function(prec) {
                    if(prec) {
                      var
                      replacedKey = deepKeys.replaceKeys(model.apiFeed.processKeysOnRecord[_k].key, rec),
                      _kv = deepKeys.getValue(prec, replacedKey);
                      //console.log("2 ** " + idx + " ** " + _kv);
                      deepKeys.assignValue(rec, _k, _kv);
                      //console.log(rec[_k]);
                    }
                    else {
                      console.log("Error : No Prec");
                      //console.log(rec);
                    }
                  });
                }
              })();
            }
            tr.wait();
            tr.andThen(function() {
              if(model.apiFeed.incrementalBy) {
                if(!meta.incrementalMeta) {
                  meta.incrementalMeta = {};
                }
                var
                incrementalByVal = deepKeys.getValue(rec, model.apiFeed.incrementalBy),
                prevIncrementalObj = meta.incrementalMeta[incrementalByVal],
                recCopy = JSON.parse(JSON.stringify(rec));
                meta.incrementalMeta[incrementalByVal] = rec;
                /*if(rec && rec.curEvents && rec.curEvents.length > 0) {
                  console.log(rec.curEvents);
                }*/
                if(prevIncrementalObj) {
                  rec = deepKeys.diff(prevIncrementalObj, rec, model.apiFeed.ignoreKeysForDiff || {});
                  if(rec !== undefined) {
                    var retainKeys = model.retainKeys || model.searchAttr;
                    for(var i = 0; i < retainKeys.length; i++) {
                      deepKeys.assignValue(rec, retainKeys[i], deepKeys.getValue(recCopy, retainKeys[i]));
                    }
                  }
                }
              }
              //console.log(JSON.stringify(rec));
              //console.log("3 ** " + idx);
              /*if(rec && rec.curEvents && rec.curEvents.length > 0) {
                console.log("AFTER!");
                console.log(rec.curEvents);
              }*/
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
            });
            tr.onError(function(err) {
              reject(err);
            });
          });
        }, data[i], i, tracker);
      }

      tracker.andThen(function() {
        //console.log("Call end");
        callback(null, dataArr);
      });

      tracker.onError(function(err) {
        console.log(err.stack);
        callback(err);
      });
    });
  },

  getDataCreateIfNotPresent : function(rec, config, params, meta) {
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
    });
  },

  getDataFromAPIWrapper : function(rec, config, params, meta) {
    var p = {
      apiKey : params.apiKey,
    };
    for(var k in config.paramToApi) {
      deepKeys.assignValue(p, k, deepKeys.getValue({
        params : params,
        rec    : rec,
      }, config.paramToApi[k]));
    }
    return getDataFromAPI(config.apiParams, p, meta);
  },

  createOrUpdateRec : function(modelName, rec) {
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
    });
  },

  extractEvents : function(rec, config, params, meta) {
    return new Promise(function(resolve, reject) {
      if(!rec || !meta.incrementalMeta || !meta.incrementalMeta[rec.match_id]) {
        resolve([]);
      }
      else {
        var
        prevIncrementalObj = meta.incrementalMeta[rec.match_id];
        extractEvents(prevIncrementalObj, rec, function(events) {
          resolve(events);
        });
      }
    });
  },

  readFromFile : function(rec, config, params, meta) {
    return new Promise(function(resolve, reject) {
      readFromFile(config, rec).then(function(val) {
        resolve(val);
      });
    });
  },
};

module.exports = methods;

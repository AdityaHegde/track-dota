var
https = require("https"),
mongoose = require("mongoose"),
Promise = require("promise2").Promise,
PromiseTracker = require("promise2").PromiseTracker,
deepKeys = require("deep-keys-lib"),
mongodbAPI = require("../../lib/mongodbAPI"),
extractEvents = require("./extractEvents"),
readFromFile = require("./readFromFile"),
models = {
  game     : require("../../models/gameSnapshot"),
  hero     : require("../../models/hero"),
  ability  : require("../../models/ability"),
  item     : require("../../models/item"),
  league   : require("../../models/league"),
  team     : require("../../models/team"),
  teamLogo : require("../../models/teamLogo"),
  player   : require("../../models/player"),
},
teams = ["radiant", "dire"];

mongodbAPI.init(models);

var methods = {

  getData : function(modelName, params, meta, callback) {
    var
    model = models[modelName],
    tracker = new PromiseTracker(),
    dataArr = [];

    methods.getDataFromAPI(model, params, meta, tracker, 0).then(function(data) {
      data = deepKeys.getValue(data, model.apiFeed.resultBase) || [];
      if(data && !data.length) {
        data = [data];
      }
      methods.correctAbilities(meta.rawResult, data, meta);
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
                  methods[model.apiFeed.processKeysOnRecord[_k].type](v, model.apiFeed.processKeysOnRecord[_k], params, meta, tr, 1).then(function(prec) {
                    if(prec) {
                      var
                      replacedKey = deepKeys.replaceKeys(model.apiFeed.processKeysOnRecord[_k].key, prec),
                      _kv = deepKeys.getValue(prec, replacedKey);
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

  getDataFromAPI : function(model, params, meta, tracker, type) {
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
            var data = JSON.parse(str);
            meta.rawResult = str;
            resolve(data);
          } catch(e) {
            reject(e);
          }
        });
      }).end();
    }, tracker, type);
  },

  getDataFromAPIWrapper : function(rec, config, params, meta, tracker, type) {
    var p = {
      apiKey : params.apiKey,
    };
    for(var k in config.paramToApi) {
      deepKeys.assignValue(p, k, deepKeys.getValue({
        params : params,
        rec    : rec,
      }, k));
    }
    return getDataFromAPI(config.model, params, meta, tracker, type);
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

  extractEvents : function(rec, config, params, meta, tracker, type) {
    return new Promise(function(resolve, reject) {
      if(!rec || !meta.incrementalMeta || !meta.incrementalMeta[rec.match_id]) {
        setTimeout(function() {
          resolve([]);
        }, 10);
      }
      else {
        var
        prevIncrementalObj = meta.incrementalMeta[rec.match_id];
        extractEvents(prevIncrementalObj, rec, function(events) {
          resolve(events);
        });
      }
    }, tracker, type);
  },

  readFromFile : function(rec, config, params, meta, tracker, type) {
    return new Promise(function(resolve, reject) {
      readFromFile(config, rec).then(function(val) {
        resolve(val);
      });
    }, tracker, type);
  },

  correctAbilities : function(rawData, data, meta) {
    var
    abilities = rawData.match(/"abilities"\s*:\s*(\[(?:.|\n)*?\])/g),
    abilitiesObjMap = {},
    abilitiesObjs = [];
    if(abilities) {
      for(var i = 0; i < abilities.length; i++) {
        var
        abilArr = abilities[i].replace(/"abilities"\s*:\s*/ ,""),
        abilArrKey = JSON.stringify(JSON.parse(abilArr));
        abilitiesObjMap[abilArrKey] = i;
        abilitiesObjs.push(abilArr);
      }
      var lastPlayerBlock = 0;
      for(var i = 0; i < data.length; i++) {
        if(data[i].scoreboard) {
          for(var t = 0; t < teams.length; t++) {
            if(data[i].scoreboard[teams[t]] && data[i].scoreboard[teams[t]].abilities) {
              var
              abilArrKey = JSON.stringify(data[i].scoreboard[teams[t]].abilities);
              abilArrIdx = abilitiesObjMap[abilArrKey];
              for(var j = lastPlayerBlock, k = 0; j <= abilArrIdx; ) {
                var hero_id = data[i].scoreboard[teams[t]].players[k].hero_id;
                for(var a = 0; a < abilitiesObjs[j].length; a++) {
                  if(meta.abilitiesMap[abilitiesObjs[j].ability_id].hero_id === hero_id) {
                    data[i].scoreboard[teams[t]].players[k].abilities = abilitiesObjs[j];
                    console.log("added abilities ! " + teams[t] + " : " + k + " : " + i);
                    j++;
                    break;
                  }
                }
                k++;
              }
              delete data[i].scoreboard[teams[t]].abilities;
              lastPlayerBlock = abilArrIdx + 1;
              console.log("corrected ! " + teams[t] + " : " + abilArrIdx);
            }
          }
        }
      }
    }
  },
};

module.exports = methods;

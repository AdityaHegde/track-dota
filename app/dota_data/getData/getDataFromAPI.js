var
https = require("https"),
http = require("http"),
Promise = require("promise2").Promise,
deepKeys = require("deep-keys-lib"),

modules = {
  "http"  : http,
  "https" : https,
},

getDataFromAPI = function(apiParams, params, meta) {
  var
  promise,
  host = deepKeys.replaceKeys(apiParams.host, params),
  path = deepKeys.replaceKeys(apiParams.path, params),
  storeBackup = 0;
  promise = new Promise(function(resolve, reject) {
    var
    callType = apiParams.callType || "https",
    callModule = modules[callType];
    console.log("call made " + host + path);
    if(meta.apiDataCache && meta.apiDataCache[host + path]) {
      meta.apiDataCache[host + path].then(function(data) {
        resolve(data);
      });
    }
    else {
      if(!meta.apiDataCache) {
        meta.apiDataCache = {};
      }
      storeBackup = 1;
      callModule.request({
        host : host,
        path : path,
      }, function(res) {
        var str = "";
        res.on("data", function(chunk) {
          str += chunk;
        });
        res.on("end", function() {
          try {
            str = str.replace(/"([\w_]*logo[\w_]*)"\s*:\s*(\d*)\s*,/g, "\"$1\" : \"$2\",");
            var data = JSON.parse(str);
            meta.rawResult = str;
            resolve(data);
          } catch(e) {
            reject(e);
          }
        });
      }).end();
    }
  });
  if(storeBackup === 1) {
    meta.apiDataCache[host + path] = promise;
  }
  return promise;
};

module.exports = getDataFromAPI;

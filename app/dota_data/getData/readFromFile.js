var
Promise = require("promise2").Promise,
PromiseTracker = require("promise2").PromiseTracker,
fs = require("fs"),
deepKeys = require("deep-keys-lib"),

registry = {},

readFromFile = function(config, baseRec) {
  return new Promise(function(resolveMain, rejectMain) {
    var
    t = new PromiseTracker(),
    fileMap;
    new Promise(function(resolve, reject) {
      if(registry[config.fileName]) {
        console.log("found!");
        fileMap = registry[config.fileName];
        setTimeout(function() {
          resolve();
        }, 10);
      }
      else {
        fs.readFile(config.fileName, "utf8", function(err, data) {
          if(err) {
            reject(err);
          }
          else {
            var
            rows = data.split(config.rowsRegex),
            rowRecs = [],
            rowsMap = {};
            if(rows) {
              for(var i in rows) {
                var
                parts = rows[i].match(config.partsRegex),
                rowRec = {};
                for(var j in config.partsKeys) {
                  deepKeys.assignValue(rowRec, config.partsKeys[j], parts[j]);
                }
                if(parts) {
                  rowsMap[parts[config.mapValIdx]] = rowRec;
                }
              }
            }
            registry[config.fileName] = rowsMap;
            fileMap = rowsMap;
            resolve();
          }
        });
      }
    }, t, 0);
    new Promise(function(resolve, reject) {
      var
      sv = deepKeys.getValue(baseRec, config.searchValueKey),
      sr = fileMap[sv];
      resolve();
      resolveMain(sr);
    }, t, 0);
  });
};

module.exports = readFromFile;

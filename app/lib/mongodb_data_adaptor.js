var
mongoose = require('mongoose'),
utils = require('./utils'),
modelMap = {},
config = require("../config/config");
mongoose.connect(config.db.mongodb);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.log("connection successful");
});

function returnIds(data) {
  var returnData = {_id : data._id};
  for(var k in data) {
    if(k !== "_id") {
      if(typeof data[k].length === "number") {
        returnData[k] = [];
        for(var i = 0; i < data[k].length; i++) {
          returnData[k].push(returnIds(data[k][i]));
        }
      }
      else if(typeof data[k] === "object") {
        returnData[k] = returnIds(data[k]);
      }
    }
  }
  return returnData;
}

exports.init = function(entities) {
  for(var k in entities) {
    if(typeof entities[k] === "string") {
      modelMap[k] = require(entities[k]);
    }
    else {
      modelMap[k] = entities[k];
    }
  }
};

exports.create = function(modelName, jsonData, callback, fetchFull) {
  var model = modelMap[modelName],
      obj = new model(jsonData);
  console.log("Create "+modelName);
  console.log(jsonData);
  obj.save(function(err, obj) {
    if(err) {
      callback(err);
    }
    else {
      if(fetchFull) {
        callback(null, obj.toObject());
      }
      else {
        callback(null, returnIds(obj.toObject()));
      }
    }
  });
};

exports.get = function(modelName, param, callback, createIfNotPresent) {
  var query = {}, model = modelMap[modelName];
  query[model.searchAttr] = param[model.queryParam] || param[model.searchAttr];
  console.log("Get "+modelName);
  console.log(query);
  model.findOne(query, function(err, obj) {
    if(err || !obj) {
      if(createIfNotPresent) {
        exports.create(modelName, param, function(err, data) {
          if(err) {
            callback(err);
          }
          else {
            callback(null, data);
          }
        }, 1);
      }
      else {
        callback(err);
      }
    }
    else {
      callback(null, obj.toObject());
    }
  });
};

exports.getAll = function(modelName, param, callback) {
  var query = {}, model = modelMap[modelName];
  console.log("GetAll "+modelName);
  console.log(query);
  model.find(query, function(err, objs) {
    if(err || !objs) {
      callback(err);
    }
    else {
      for(var i = 0; i < objs.length; i++) {
        objs[i] = objs[i].toObject();
      }
      callback(null, objs);
    }
  });
};

exports.update = function(modelName, param, callback, fetchFull) {
  var query = {}, model = modelMap[modelName];
  query[model.searchAttr] = param[model.queryParam] || param[model.searchAttr];
  model.update(query, param, {}, function(err) {
    if(err) {
      callback(err);
    }
    else {
      if(fetchFull) {
        callback(null, param);
      }
      else {
        callback(null, returnIds(param));
      }
    }
  });
};

exports.delete = function(modelName, param, callback) {
  var query = {}, model = modelMap[modelName];
  query[model.searchAttr] = param[model.queryParam] || param[model.searchAttr];
  model.remove(query, function(err) {
    if(err) {
      callback(err);
    }
    else {
      callback(null, {_id : param._id});
    }
  });
};

exports.create_or_update = function(modelName, param, callback, fetchFull) {
  var query = {}, model = modelMap[modelName];
  query[model.searchAttr] = param[model.queryParam] || param[model.searchAttr];
  model.findOne(query, function(err, obj) {
    if(err || !obj) {
      exports.create(modelName, param, function(err, obj) {
        callback(err, obj);
      }, fetchFull);
    }
    else {
      exports.update(modelName, param, function(err, obj) {
        callback(err, obj);
      }, fetchFull);
    }
  });
};

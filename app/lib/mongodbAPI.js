var
mongoose = require("mongoose"),
utils = require("./utils"),
deepKeys = require("deep-keys-lib"),
promise = require("promise2"),
modelMap = {};

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

function formQuery(model, param, type) {
  var
  query = {},
  keys = type === "query" ? model.queryParam : model.searchAttr;
  for(var j = 0; j < keys.length; j++) {
    deepKeys.assignValue(query, keys[j], deepKeys.getValue(param, keys[j]));
  }
  return query;
}

exports.create = function(modelName, jsonData, callback) {
  var model = modelMap[modelName],
      obj = new model(jsonData);
  //console.log("Create "+modelName);
  //console.log(jsonData);
  obj.save(function(err, obj) {
    if(err) {
      callback(err);
    }
    else {
      callback(null, obj);
    }
  });
};

exports.get = function(modelName, param, callback) {
  var
  model = modelMap[modelName],
  query = formQuery(model, param, "query");
  //console.log("Get "+modelName);
  //console.log(query);
  model.findOne(query, function(err, obj) {
    if(err) {
      callback(err);
    }
    else {
      callback(null, obj);
    }
  });
};

exports.getAll = function(modelName, param, callback) {
  var
  model = modelMap[modelName],
  query = {};
  //console.log("GetAll "+modelName);
  //console.log(query);
  model.find(query, function(err, objs) {
    if(err) {
      callback(err);
    }
    else {
      callback(null, objs);
    }
  });
};

exports.update = function(modelName, param, callback, fetchFull) {
  var
  model = modelMap[modelName],
  query = formQuery(model, param, "query");
  model.update(query, param, {}, function(err, obj) {
    if(err) {
      callback(err);
    }
    else {
      callback(null, obj);
    }
  });
};

exports.delete = function(modelName, param, callback) {
  var
  model = modelMap[modelName],
  query = formQuery(model, param, "query");
  model.remove(query, function(err, obj) {
    if(err) {
      callback(err);
    }
    else {
      callback(null, obj);
    }
  });
};

exports.create_or_update = function(modelName, param, callback) {
  var
  model = modelMap[modelName],
  query = formQuery(model, param, "query");
  model.findOne(query, function(err, obj) {
    if(err) {
      callback(err);
    }
    else if(!obj) {
      model.create(param, function(err, obj) {
        callback(err, obj);
      });
    }
    else {
      obj.set(param);
      obj.save(function(err, obj) {
        callback(err, obj);
      });
    }
  });
};

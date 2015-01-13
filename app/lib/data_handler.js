var
utils = require("./utils"),
mongodb_data_adaptor = require("./mongodb_data_adaptor");

function extractParams(path, query) {
  query = query || {};
  var pathParts = path.match(/^.*?api\/(.*)$/)[1],
  model = "", lastModelHasId = 0;
  pathParts = pathParts.split("/");
  for(var i = 0; i < pathParts.length; i += 2) {
    model = pathParts[i];
    if(i + 1 < pathParts.length) {
      query[model] = pathParts[i+1];
      if(i + 1 === pathParts.length - 1) {
        lastModelHasId = 1;
      }
    }
  }
  return [model, query, lastModelHasId];
}

function handleRequest(req, res, params, method, methodAlternate) {
  methodAlternate = methodAlternate || method;
  var
  requestParams = extractParams(req.path, params),
  model = requestParams[0],
  query = requestParams[1],
  lastModelHasId = requestParams[2],
  methodToUse = lastModelHasId === 1 ? method : methodAlternate,
  meta = {};
  mongodb_data_adaptor[methodToUse](model, query, function(err, data) {
    if(err) {
      res.send(utils.retError(err));
    }
    else {
      if(req.user) {
        meta.user = req.user;
      }
      res.send(utils.retResult(data, meta));
    }
  });
}

module.exports = {
  get : function(req, res) {
    handleRequest(req, res, req.query, "get", "getAll");
  },

  create : function(req, res) {
    handleRequest(req, res, req.body, "create");
  },

  update : function(req, res) {
    handleRequest(req, res, req.body, "update");
  },

  delete : function(req, res) {
    handleRequest(req, res, req.body, "delete");
  },
};

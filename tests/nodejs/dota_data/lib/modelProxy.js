var
modelProxy = function(opts) {
  this.opts = opts || {};
  this.opts.data = this.opts.data || {};
  this.lastCall = [];
};

modelProxy.prototype.create = function(data, callback) {
  var
  proxy = this;
  proxy.lastCall.push(["create", data]);

  setTimeout(function() {
    proxy.opts.data[data[proxy.opts.primaryKey]] = data;
    callback(null, data);
  }, 50);
};

modelProxy.prototype.update = function(data, callback) {
  var
  proxy = this;
  proxy.lastCall.push(["save", data]);

  setTimeout(function() {
    proxy.opts.data[data[proxy.opts.primaryKey]] = data;
    callback(null, data);
  }, 50);
};

modelProxy.prototype.findOne = function(data, callback) {
  var
  proxy = this;
  proxy.lastCall.push(["findOne", data]);

  setTimeout(function() {
    if(proxy.opts.data[data[proxy.opts.primaryKey]]) {
      callback(null, proxy.opts.data[data[proxy.opts.primaryKey]]);
    }
    else {
      callback(null, null);
    }
  }, 50);
};

module.exports = modelProxy;

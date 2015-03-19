var
EventEmitter = require('events').EventEmitter,
httpsMock = function(opts) {
  this.opts = opts || [];
  this.callCounter = 0;
};

httpsMock.prototype.request = function(options, callback) {
  this.callCounter++;

  var data = this.opts.data[options.host + options.path];
  return {
    end : function() {
      var e = new EventEmitter();
      callback(e);
      e.emit("data", data[0]);
      for(var i = 1; i < data.length - 1; i++) {
        (function() {
          var j = i;
          setTimeout(function() {
            e.emit("data", data[j]);
          }, j);
        })();
      }
      setTimeout(function() {
        e.emit("data", data[data.length - 1]);
        e.emit("end");
      }, data.length + 5);
    },
  };
};

module.exports = httpsMock;

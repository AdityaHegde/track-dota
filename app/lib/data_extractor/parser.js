var
http = require('http'),
jsdom = require("jsdom"),
fs = require("fs"),
jquery = fs.readFileSync("../../../public/js/lib/jquery-2.1.1.js", "utf-8");

module.exports = function(options, callback) {
  jsdom.env({
    url : options.url,
    src : [jquery],
    done : function(errors, window) {
      if(errors) {
        callback(errors);
      }
      else {
        var
        $ = window.$,
        ret;
        if(typeof options.selector === "string") {
          ret = $(options.selector);
        }
        else if(typeof options.selector.length === "number") {
          ret = [];
          for(var i = 0; i < options.selector.length; i++) {
            ret.push($(options.selector[i]));
          }
        }
        callback(null, ret, $);
      }
    },
  });
};

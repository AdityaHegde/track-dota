var require = {
  baseUrl : "js",
  paths : {
    jquery             : "lib/jquery-2.1.1",
    handlebars         : "lib/handlebars",
    ember              : "lib/ember",
    ember_qunit        : "lib/ember-qunit",
    ember_data         : "lib/ember-data",
    bootstrap          : "lib/bootstrap",
    jquery_mockjax     : "lib/jquery.mockjax",
    "ember-utils"      : "lib/ember-utils",
    "ember-utils-core" : "lib/ember-utils-core",
    "socket.io"        : "lib/socket.io",
  },
  shim : {
    jquery_mockjax : ["jquery"],
    bootstrap : ["jquery"],
    ember : {
      deps : [ "jquery", "handlebars" ],
      exports : "Ember",
    },
    ember_data : {
      deps : [ "ember" ],
      exports : "DS",
    },
    ember_qunit : ["ember"],
    "ember-utils-core" : {
      deps : ["ember"],
      exports : "Utils",
    },
    "ember-utils" : ["ember_data", "bootstrap", "ember-utils-core"],
    "socket.io" : {
      exports : "io",
    },
  },
  waitSeconds : 10,
};

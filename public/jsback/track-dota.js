define([
  "socket.io",
  "ember-utils",
  "./app",
  "./column-data",
  "./controllers/main",
  "./objects",
  "./routes",
  "./templates",
  "./views",
], function(io) {
  window.io = io;
});

define([
  "socket.io",
  "ember-utils",
  "./app",
  "./column-data",
  "./controllers/main",
  "./objects/main",
  "./routes",
  "./templates",
  "./views/main",
], function(io) {
  window.io = io;
});

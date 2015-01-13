var
mongodb_data_adaptor = require("./lib/mongodb_data_adaptor");

module.exports = function(io) {
  io.sockets.on("connection", function(socket) {
    socket.on('send', function (data) {
      mongodb_data_adaptor.get("profile", { profile_id : data.profile_id }, function(err, user) {
        if(!err && user) {
          io.sockets.emit('message', {
            message   : data.message,
            user      : user.displayName,
            timestamp : new Date(),
          });
        }
      });
    });
  });
};

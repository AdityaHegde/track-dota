var
getDataModule = require("./dota_data/getData"),
Team = require("./models/team"),
config = require("./config/config");

var
fullData = {},
lastCollectedGames = [];

module.exports = {
  connection : function(io) {
    io.sockets.on("connection", function(socket) {
      socket.on('join', function (data) {
        if(data.match_id) {
          socket.join(data.match_id + "");
          console.log("Client joined " + data.match_id);
          socket.emit("data", {
            result : fullData[data.match_id],
            first  : 1,
          });
        }
      });
    });
  },

  collectGameDataAndSend : function(io) {
    var
    meta = {
      incrementalMeta : fullData,
    },
    params = {
      apiKey : config.config,
    };

    setInterval(function() {
      getDataModule.getData("game", params, meta, function(err, games) {
        if(games && games.length) {
          var _lastCollectedGames = [];
          for(var i = 0; i < games.length; i++) {
            _lastCollectedGames.push(games[i].match_id);
            io.to(games[i].match_id + "").emit("data", {
              result : games[i],
            });
          }
          lastCollectedGames = _lastCollectedGames;
        }
      });
    }, 10000);
  },

  getRunningMatches : function() {
    return lastCollectedGames;
  },
};

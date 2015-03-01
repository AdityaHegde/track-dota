var
GameSnapshot = require("../models/gameSnapshot"),
Team = require("../models/team");

module.exports = function(match_id, callback) {
  GameSnapshot.find({match_id : match_id}).sort({_id : 1}).exec(function(err, gameSnapshots) {
    if(err) {
      callback(err);
    }
    else {
      var callCallback = 1;
      if(gameSnapshots.length > 0) {
        var teams = [];
        if(gameSnapshots[0].radiant_team) {
          teams.push(gameSnapshots[0].radiant_team);
        }
        if(gameSnapshots[0].dire_team) {
          teams.push(gameSnapshots[0].dire_team);
        }
        if(teams.length > 0) {
          callCallback = 0;
          Team.find().where("_id").in(teams).exec(function(err, teams) {
            if(err) {
              callback(err);
            }
            else {
              callback(null, {
                gameSnapshots : gameSnapshots,
                teams         : teams,
              });
            }
          });
        }
      }
      if(callCallback === 1) {
        callback(null, {
          gameSnapshots : gameSnapshots
        });
      }
    }
  });
};

var
Team = require("../models/team");

module.exports = function(team_ids, player_ids, callback) {
  Team.find().where("_id").in(team_ids).exec(function(err, teams) {
    if(err) {
      callback(err);
    }
    else {
      callback(null, teams);
    }
  });
};

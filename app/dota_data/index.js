var
utils         = require("../lib/utils"),
getData       = require("./getData"),
getDataByGame = require("./getDataByGame"),
getStaticData = require("./getStaticData"),
getTeamAndPlayerInfo = require("./getTeamAndPlayerInfo"),
config = require("../config/config");

module.exports = {
  getData       : getData.getData,
  getDataByGame : getDataByGame,
  getStaticData : getStaticData,

  handleGameDataRequest : function(req, res) {
    getDataByGame(Number(req.query.match_id), function(err, data) {
      if(err) {
        res.send(utils.retError(err));
      }
      else {
        res.send(utils.retResult(data));
      }
    });
  },

  handleGameStaticDataRequest : function(req, res) {
    getStaticData(function(err, data) {
      if(err) {
        res.send(utils.retError(err));
      }
      else {
        res.send(utils.retResult(data));
      }
    });
  },

  handleTeamAndPlayerDataRequest : function(req, res) {
    var teamIds = req.query.team_ids.split(",");
    getTeamAndPlayerInfo(teamIds, [], function(err, data) {
      if(err) {
        res.send(utils.retError(err));
      }
      else {
        res.send(utils.retResult(data));
      }
    });
  },

  loadStaticData : function(req, res) {
    var
    sd = 0,
    heros,
    abilities,
    assignAbilitiesToHeros = function() {
      if(heros && abilities) {
      }
    };
    callback = function() {
      sd++;
      if(sd === 4) {
        res.send(utils.retResult());
      }
    };
    getData.getData("hero", {apiKey : config.dota2.apiKey}, {}, function(err, heroRecs) {
      heros = heroRecs;
      assignAbilitiesToHeros();
      callback();
    });
    getData.getData("item", {apiKey : config.dota2.apiKey}, {}, callback);
    getData.getData("ability", {apiKey : config.dota2.apiKey}, {}, function(err, abilityRecs) {
      abilities = abilityRecs;
      assignAbilitiesToHeros();
      callback();
    });
    getData.getData("league", {apiKey : config.dota2.apiKey}, {}, callback);
  },
};

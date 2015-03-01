define([
  "ember",
  "../app",
  "ember-utils",
], function(Ember, Dota) {

Dota.GameController = ArrayMod.ArrayModController.extend({
  init : function() {
    this._super();
    this.connectToSocket();
    this.fetchCurrentMatches();
  },

  currentMatches : null,
  fetchCurrentMatches : function() {
    var that = this;
    $.ajax({
      url : "/dotadata/getCurrentMatches",
      dataType : "json",
    }).then(function(data) {
      that.set("currentMatches", data.result.data);
    });
  },

  unique_id : "playerStats",

  statView : "cs",
  statViewDidChange : function() {
    var
    statView = this.get("statView"),
    arrayMods = this.get("arrayMods");
    arrayMods.clear();
    arrayMods.pushObjects(this.get(statView + "SortMod"));
  }.observes("statView"),

  statViews : [{
    viewName : "kda",
    viewLabel : "KDA",
  }, {
    viewName : "cs",
    viewLabel : "Creep Stats",
  }, {
    viewName : "level",
    viewLabel : "Level",
  }, {
    viewName : "networth",
    viewLabel : "Networth",
  }],

  kdaSortMod : [
    ArrayMod.ArraySortModifier.create({
      property : "kills",
      order : false,
    }),
    ArrayMod.ArraySortModifier.create({
      property : "assists",
      order : false,
    }),
    ArrayMod.ArraySortModifier.create({
      property : "deaths",
    }),
  ],
  csSortMod : [
    ArrayMod.ArraySortModifier.create({
      property : "last_hits",
      order : false,
    }),
    ArrayMod.ArraySortModifier.create({
      property : "denies",
      order : false,
    }),
  ],
  levelSortMod : [
    ArrayMod.ArraySortModifier.create({
      property : "level",
      order : false,
    }),
  ],
  networthSortMod : [
    ArrayMod.ArraySortModifier.create({
      property : "net_worth",
      order : false,
    }),
  ],

  hasGameData : false,
  curGameData : null,
  curFullData : null,
  curTeams    : {},
  gameFeed    : null,
  actions : {
    fetchGameData : function(match_id) {
      var controller = this;
      this.get("socket").emit("join", {
        match_id : match_id,
      });
    },

    playerSelected : function(player) {
      console.log(player);
    },

    teamSelected : function(team) {
      console.log(team);
    },
  },

  socket : null,
  connectToSocket : function() {
    var socket = io.connect("/"), that = this;
    socket.on("data", function(data) {
      if(data.first) {
        that.fetchCurrentTeams(data.result);
        that.set("gameFeed", []);
      }
      else {
        that.gameDataRecieved(data.result);
      }
    });
    this.set("socket", socket);
  },

  gameDataRecieved : function(gameData) {
    var
    curFullData = this.get("curFullData") || {},
    nextFullData = Utils.merge(curFullData, gameData, 1),
    curTeams = this.get("curTeams"),
    model = this.get("model"),
    gameDataObj;
    this.set("curFullData", JSON.parse(JSON.stringify(nextFullData)));
    
    if(nextFullData.radiant_team) {
      nextFullData.radiant_team = JSON.parse(JSON.stringify(curTeams[nextFullData.radiant_team]));
    }
    if(nextFullData.dire_team) {
      nextFullData.dire_team = JSON.parse(JSON.stringify(curTeams[nextFullData.dire_team]));
    }

    gameDataObj = Dota.GameSnapshotObject.create(nextFullData);

    model.clear();
    model.pushObjects(gameDataObj.get("scoreboard.radiant.players") || []);
    model.pushObjects(gameDataObj.get("scoreboard.dire.players") || []);

    this.get("gameFeed").pushObjects(gameDataObj.get("curFeed"));
    console.log(gameDataObj.get("curFeed"));

    this.set("curGameData", gameDataObj);
    this.set("hasGameData", true);
  },

  fetchCurrentTeams : function(gameData) {
    var
    teamIds = [],
    controller = this;
    if(gameData.radiant_team) {
      teamIds.push(gameData.radiant_team);
    }
    if(gameData.dire_team) {
      teamIds.push(gameData.dire_team);
    }
    if(teamIds.length > 0) {
      $.ajax({
        url : "/dotadata/getTeamAndPlayerInfo?team_ids=" + teamIds.join(","),
        dataType : "json",
      }).then(function(data) {
        var curTeams = {};
        for(var i = 0; i < data.result.data.length; i++) {
          curTeams[data.result.data[i]._id] = data.result.data[i];
        }
        controller.set("curTeams", curTeams);
        controller.gameDataRecieved(gameData);
      });
    }
    else {
      controller.gameDataRecieved(gameData);
    }
  },
});

});

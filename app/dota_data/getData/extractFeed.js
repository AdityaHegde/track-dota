var
deepKeys = require("deep-keys-lib"),

extractFeed = function(last, cur) {
  var
  diff = deepKeys.diff(last, cur, {curFeed : 1}),
  feeds = [];
  //console.log(diff);

  if(diff) {
    extractPlayersFeed(diff, last, cur, feeds);
  }

  return feeds;
},

extractPlayersFeed = function(diff, last, cur, feeds) {
  try {
    if(diff.scoreboard && ( (diff.scoreboard.radiant && diff.scoreboard.radiant.players) || (diff.scoreboard.dire && diff.scoreboard.dire.players) ) ) {
      var tfFeed = {
        type : "teamFight",
        data : {
          kills   : [],
          death   : [],
          radiant : {
            netWorthDiff : 0,
            goldDiff     : 0,
          },
          dire    : {
            netWorthDiff : 0,
            goldDiff     : 0,
          },
        },
      },
      hasTfFeed = 0,
      ipFeed = {
        type : "itemPickup",
        data : {
          players : [],
        },
      },
      hasIpFeed = 0,
      bdFeed = {
        type : "buildingDestroyed",
        data : {
          radiant : {
            towers : 0,
            barracks : 0,
          },
          dire : {
            towers : 0,
            barracks : 0,
          },
        },
      },
      hasBdFeed = 0,
      teams = ["radiant", "dire"],
      types = ["kills", "death"];
      for(var t in teams) {
        var
        team = diff.scoreboard[teams[t]],
        lastTeam = (last && last.scoreboard && last.scoreboard[teams[t]]) || {},
        curTeam = (cur && cur.scoreboard && cur.scoreboard[teams[t]]) || {};
        if(team) {
          for(var i = 0; i < team.players.length; i++) {
            if(team.players[i]) {
              var
              player = team.players[i],
              lastPlayer = (lastTeam.players && lastTeam.players[i]) || {},
              curPlayer = (curTeam.players && curTeam.players[i]) || {};

              //team fight feed
              for(var ty in types) {
                var tk = types[ty];
                if(player[tk]) {
                  tfFeed.data[tk].push({
                    player_slot : curPlayer.player_slot,
                    hero_id     : curPlayer.hero_id,
                    team        : t,
                    amt         : player[tk] - lastPlayer[tk],
                  });
                  hasTfFeed = 1;
                }
              }
              tfFeed.data[teams[t]].netWorthDiff += curPlayer.net_worth - lastPlayer.net_worth;
              tfFeed.data[teams[t]].goldDiff += curPlayer.gold - lastPlayer.gold;


              //item pickup feed
              var
              diffItemMap = {},
              lastItemMap = {};
              for(var j = 0; j < 6; j++) {
                var ik = "item" + j;
                if(player[ik]) {
                  diffItemMap[player[ik]] = 1;
                }
                if(lastPlayer[ik]) {
                  lastItemMap[lastPlayer[ik]] = 1;
                }
              }
              var itemsDiff = deepKeys.diff(lastItemMap, diffItemMap, {});
              if(itemsDiff) {
                var playerItemPickup = {
                  items       : [],
                  player_slot : curPlayer.player_slot,
                  hero_id     : curPlayer.hero_id,
                  team        : t,
                };
                for(var ik in itemsDiff) {
                  playerItemPickup.items.push(ik);
                }
                ipFeed.data.players.push(playerItemPickup);
                hasIpFeed = 1;
              }


              //building destroyed
              if(team.tower_state) {
                bdFeed.data[teams[t]].towers = lastTeam.tower_state ^ curTeam.tower_state;
                hasBdFeed = 1;
              }
              if(team.barracks_state) {
                bdFeed.data[teams[t]].barracks = lastTeam.barracks_state ^ curTeam.barracks_state;
                hasBdFeed = 1;
              }
            }
          }
        }
      }
      if(hasTfFeed === 1) {
        feeds.push(tfFeed);
      }
      if(hasIpFeed === 1) {
        feeds.push(ipFeed);
      }
      if(hasBdFeed === 1) {
        feeds.push(bdFeed);
      }
    }
  } catch(e) {
    console.log(e);
  }
};

module.exports = extractFeed;

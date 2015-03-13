var
deepKeys = require("deep-keys-lib"),
teams = ["radiant", "dire"],
types = ["kills", "death", "assists"],
buildingsTypes = ["tower", "barracks"],
buildingsSubtypes = [11, 6],
ItemPickup = require("../../models/events/itemPickup"),
KDA = require("../../models/events/kda"),
BuildingDestroyed = require("../../models/events/buildingDestroyed"),
AbilitySkilled = require("../../models/events/abilitySkilled"),
PlayerEvent = require("../../models/events/playerEvent"),
Promise = require("promise2").Promise,
PromiseTracker = require("promise2").PromiseTracker,

extractEvents = function(last, cur, callback) {
  var
  diff = deepKeys.diff(last, cur, {curEvents : 1});
  //console.log(diff);

  if(diff) {
    getOrCreatePlayerEventObjects(cur, function(heroIdToPlayerMap) {
      extractPlayersEvents(diff, last, cur, heroIdToPlayerMap, function(events) {
        callback(events);
      });
    })
  }
  else {
    setTimeout(function() {
      callback([]);
    }, 10);
  }
},

extractKDA = function(diffPlayer, lastPlayer, curPlayer, curTeam, cur, heroIdToPlayerMap, events, tracker, type) {
  var
  kdaTotalCount = 0,
  kdaCurrentCount = 0;
  return new Promise(function(resolve, reject) {
    for(var i = 0; i < types.length; i++) {
      var tk = types[i];
      if(diffPlayer[tk]) {
        var
        kda = {
          match_id    : cur.match_id,
          type        : i,
          duration    : cur.scoreboard.duration,
          amt         : curPlayer[tk] - lastPlayer[tk],
          playerEvent : heroIdToPlayerMap[curPlayer.hero_id]._id,
        };
        kdaTotalCount++;
        KDA.create(kda, function(err, kdaObj) {
          events.push({
            type  : "kda",
            obj   : kdaObj,
          });
          kdaCurrentCount++;
          if(kdaCurrentCount >= kdaTotalCount) {
            resolve();
          }
        });
        //console.log("KDA");
        //console.log(kda);
      }
    }
    if(kdaTotalCount === 0) {
      setTimeout(function() {
        resolve();
      }, 10);
    }
  }, tracker, type);
},

extractItemPickup = function(diffPlayer, lastPlayer, curPlayer, curTeam, cur, heroIdToPlayerMap, events, tracker, type) {
  var
  diffItemMap = {},
  lastItemMap = {},
  ipTotalCount = 0,
  ipCurrentCount = 0;
  return new Promise(function(resolve, reject) {
    for(var j = 0; j < 6; j++) {
      var ik = "item" + j;
      if(diffPlayer[ik]) {
        diffItemMap[diffPlayer[ik]] = 1;
      }
      if(lastPlayer[ik]) {
        lastItemMap[lastPlayer[ik]] = 1;
      }
    }
    var itemsDiff = deepKeys.diff(lastItemMap, diffItemMap, {});
    if(itemsDiff) {
      for(var ik in itemsDiff) {
        var itemPickup = {
          match_id    : cur.match_id,
          item_id     : ik,
          duration    : cur.scoreboard.duration,
          playerEvent : heroIdToPlayerMap[curPlayer.hero_id]._id,
        };
        ipTotalCount++;
        ItemPickup.create(itemPickup, function(err, itemPickupObj) {
          events.push({
            type : "itemPickup",
            obj   : itemPickupObj,
          });
          ipCurrentCount++;
          if(ipCurrentCount >= ipTotalCount) {
            resolve();
          }
        });
        //console.log("Iteam Pickup");
        //console.log(itemPickup);
      }
    }
    else {
      setTimeout(function() {
        resolve();
      }, 10);
    }
  }, tracker, type);
},

extractAbilitySkilled = function(diffPlayer, lastPlayer, curPlayer, curTeam, cur, heroIdToPlayerMap, events, tracker, type) {
  return new Promise(function(resolve, reject) {
    if(diffPlayer.abilities) {
      var
      skip = 0,
      asTotalCount = 0,
      asCurrentCount = 0;
      for(var i = 0; i < diffPlayer.abilities.length; i++) {
        var
        lastAbility = lastPlayer.abilities[i - skip],
        curAbility = curPlayer.abilities[i];
        if(diffPlayer.abilities[i]) {
          var
          abilitySkilled = {
            ability_id    : curAbility.ability_id,
            ability_level : curAbility.ability_level,
            duration      : cur.scoreboard.duration,
            playerEvent   : heroIdToPlayerMap[curPlayer.hero_id]._id,
          },
          createAbilitySkilled = 1;
          if(lastAbility && lastAbility.ability_id !== curAbility.ability_id) {
            skip++;
          }
          else if(lastAbility.ability_level === curAbility.ability_level) {
            createAbilitySkilled = 0;
          }
          if(createAbilitySkilled === 1) {
            asTotalCount++;
            AbilitySkilled.create(abilitySkilled, function(err, abilitySkilledObj) {
              events.push({
                type : "abilitySkilled",
                obj  : abilitySkilledObj,
              });
              asCurrentCount++;
              if(asCurrentCount >= asTotalCount) {
                resolve();
              }
            });
            //console.log("Ability Skilled");
            //console.log(abilitySkilled);
          }
        }
      }
      if(asTotalCount === 0) {
        setTimeout(function() {
          resolve();
        }, 10);
      }
    }
    else {
      setTimeout(function() {
        resolve();
      }, 10);
    }
  }, tracker, type);
},

extractBuildingDestroyed = function(diffTeam, lastTeam, curTeam, cur, team, events, tracker, type) {
  var
  bdTotalCount = 0,
  bdCurrentCount = 0;
  return new Promise(function(resolve, reject) {
    for(var i = 0; i < buildingsTypes.length; i++) {
      var
      bty = buildingsTypes[i],
      bkey = bty + "_state",
      bdiff = lastTeam[bkey] ^ curTeam[bkey];
      for(var j = 0, bit = 1; j < buildingsSubtypes[i]; j++, bit *= 2) {
        var
        present = bdiff & bit;
        if(present) {
          var
          buildingDestroyed = {
            team     : team,
            team_id  : cur[teams[team]] ? cur[teams[team]].team_id : 0,
            type     : i,
            subtype  : j,
            duration : cur.scoreboard.duration,
          };
          bdTotalCount++;
          BuildingDestroyed.create(buildingDestroyed, function(err, buildingDestroyedObj) {
            events.push({
              type : "buildingDestroyed",
              obj  : buildingDestroyedObj
            });
            bdCurrentCount++;
            if(bdCurrentCount >= bdTotalCount) {
              resolve();
            }
          });
          //console.log("Building Destroyed");
          //console.log(buildingDestroyed);
        }
      }
    }
    if(bdTotalCount === 0) {
      setTimeout(function() {
        resolve();
      }, 10);
    }
  }, tracker, type);
},

getOrCreatePlayerEventObjects = function(cur, callback) {
  var
  map = {},
  players = 0,
  processedCount = 0,
  callCallback = function() {
    processedCount++;
    if(processedCount >= players) {
      callback(map);
    }
  };
  if(cur && cur.players) {
    for(var i = 0; i < cur.players.length; i++) {
      if(cur.players[i].hero_id) {
        (function() {
          players++;
          var
          player = cur.players[i],
          teamKey = teams[player.team] + "_team",
          playerObj = {
            hero_id    : player.hero_id,
            team       : player.team,
            account_id : player.account_id,
            team_id    : cur[teamKey] ? cur[teamKey].team_id : 0,
          };
          PlayerEvent.findOne(playerObj, function(err, obj) {
            if(!obj) {
              PlayerEvent.create(playerObj, function(err, obj) {
                map[playerObj.hero_id] = obj;
                callCallback();
              });
            }
            else {
              map[playerObj.hero_id] = obj;
              callCallback();
            }
          });
        })();
      }
    }
    if(players === 0) {
      setTimeout(function() {
        callback({});
      }, 10);
    }
  }
},

extractPlayersEvents = function(diff, last, cur, heroIdToPlayerMap, callback) {
  var
  events = [],
  tracker = new PromiseTracker();
  try {
    if(diff.scoreboard && ( (diff.scoreboard.radiant && diff.scoreboard.radiant.players) || (diff.scoreboard.dire && diff.scoreboard.dire.players) ) ) {
      for(var t in teams) {
        var
        team = diff.scoreboard[teams[t]],
        lastTeam = (last && last.scoreboard && last.scoreboard[teams[t]]) || {},
        curTeam = (cur && cur.scoreboard && cur.scoreboard[teams[t]]) || {};
        if(team && team.players) {
          for(var i = 0; i < team.players.length; i++) {
            if(team.players[i]) {
              var
              player = team.players[i],
              lastPlayer = (lastTeam.players && lastTeam.players[i]) || {},
              curPlayer = (curTeam.players && curTeam.players[i]) || {};

              extractKDA(player, lastPlayer, curPlayer, curTeam, cur, heroIdToPlayerMap, events, tracker, 1);

              extractItemPickup(player, lastPlayer, curPlayer, curTeam, cur, heroIdToPlayerMap, events, tracker, 1);

              extractAbilitySkilled(player, lastPlayer, curPlayer, curTeam, cur, heroIdToPlayerMap, events, tracker, 1);
            }
          }

          extractBuildingDestroyed(team, lastTeam, curTeam, cur, t, events, tracker, 1);
        }
      }
    }
    new Promise(function(resolve, reject) {
      resolve();
      callback(events);
    }, tracker, 0);
  } catch(e) {
    console.log(e.stack);
    callback(events);
  }
};

module.exports = extractEvents;

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
Promise = require("promise2").Promise,
PromiseTracker = require("promise2").PromiseTracker,

extractEvents = function(last, cur, callback) {
  var
  diff = deepKeys.diff(last, cur, {curEvents : 1});
  //console.log(diff);

  if(diff) {
    extractPlayersEvents(diff, last, cur, function(events) {
      callback(events);
    });
  }
  else {
    callback([]);
  }
},

extractKDA = function(diffPlayer, lastPlayer, curPlayer, curTeam, cur, team, events) {
  var
  kdaTotalCount = 0,
  kdaCurrentCount = 0;
  return new Promise(function(resolve, reject) {
    for(var i = 0; i < types.length; i++) {
      var tk = types[i];
      if(diffPlayer[tk]) {
        var
        kda = {
          match_id   : cur.match_id,
          type       : i,
          duration   : cur.scoreboard.duration,
          amt        : curPlayer[tk] - lastPlayer[tk],
          hero_id    : curPlayer.hero_id,
          team       : team,
          account_id : curPlayer.account_id,
          team_id    : cur[teams[team] + "_team"] ? cur[teams[team] + "_team"].team_id : 0,
        };
        kdaTotalCount++;
        KDA.create(kda, function(err, kdaObj) {
          events.push({
            type  : "kda",
            obj   : kdaObj,
          });
          kdaCurrentCount++;
          if(kdaCurrentCount >= kdaTotalCount) {
            resolve(events);
          }
        });
        //console.log("KDA");
        //console.log(kda);
      }
    }
    if(kdaTotalCount === 0) {
      resolve(events);
    }
  });
},

extractItemPickup = function(diffPlayer, lastPlayer, curPlayer, curTeam, cur, team, events) {
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
          match_id   : cur.match_id,
          item_id    : ik,
          duration   : cur.scoreboard.duration,
          hero_id    : curPlayer.hero_id,
          team       : team,
          account_id : curPlayer.account_id,
          team_id    : cur[teams[team] + "_team"] ? cur[teams[team] + "_team"].team_id : 0,
        };
        ipTotalCount++;
        ItemPickup.create(itemPickup, function(err, itemPickupObj) {
          events.push({
            type : "itemPickup",
            obj   : itemPickupObj,
          });
          ipCurrentCount++;
          if(ipCurrentCount >= ipTotalCount) {
            resolve(events);
          }
        });
        //console.log("Iteam Pickup");
        //console.log(itemPickup);
      }
    }
    else {
      resolve(events);
    }
  });
},

extractAbilitySkilled = function(diffPlayer, lastPlayer, curPlayer, curTeam, cur, team, events) {
  return new Promise(function(resolve, reject) {
    if(diffPlayer.abilities) {
      var
      skip = 0,
      asTotalCount = 0,
      asCurrentCount = 0;
      for(var i = 0; i < diffPlayer.abilities.length; i++) {
        //console.log("ability : " + i + " : " + skip);
        var
        lastAbility = lastPlayer.abilities[i - skip],
        curAbility = curPlayer.abilities[i];
        if(diffPlayer.abilities[i]) {
          var
          abilitySkilled = {
            match_id      : cur.match_id,
            ability_id    : curAbility.ability_id,
            ability_level : curAbility.ability_level,
            duration      : cur.scoreboard.duration,
            hero_id       : curPlayer.hero_id,
            team          : team,
            account_id    : curPlayer.account_id,
            team_id       : cur[teams[team] + "_team"] ? cur[teams[team] + "_team"].team_id : 0,
          },
          createAbilitySkilled = 1;
          if(lastAbility && lastAbility.ability_id !== curAbility.ability_id) {
            //console.log("new ability added. skipping last");
            skip++;
          }
          else if(lastAbility && lastAbility.ability_level === curAbility.ability_level) {
            createAbilitySkilled = 0;
          }
          if(createAbilitySkilled === 1) {
            asTotalCount++;
            //console.log(abilitySkilled);
            AbilitySkilled.create(abilitySkilled, function(err, abilitySkilledObj) {
              events.push({
                type : "abilitySkilled",
                obj  : abilitySkilledObj,
              });
              asCurrentCount++;
              if(asCurrentCount >= asTotalCount) {
                resolve(events);
              }
            });
            //console.log("Ability Skilled");
            //console.log(abilitySkilled);
          }
        }
      }
      if(asTotalCount === 0) {
        resolve(events);
      }
    }
    else {
      resolve(events);
    }
  });
},

extractBuildingDestroyed = function(diffTeam, lastTeam, curTeam, cur, team, events) {
  var
  bdTotalCount = 0,
  bdCurrentCount = 0;
  return new Promise(function(resolve, reject) {
    for(var i = 0; i < buildingsTypes.length; i++) {
      var
      bty = buildingsTypes[i],
      bkey = bty + "_state",
      bdiff = lastTeam[bkey] ^ curTeam[bkey];
      //console.log(bdiff + " : " + bkey + " : " + team);
      for(var j = 0, bit = 1; j < buildingsSubtypes[i]; j++, bit *= 2) {
        var
        present = bdiff & bit;
        if(present) {
          var
          buildingDestroyed = {
            match_id : cur.match_id,
            team     : team,
            team_id  : cur[teams[team] + "_team"] ? cur[teams[team] + "_team"].team_id : 0,
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
              resolve(events);
            }
          });
          //console.log("Building Destroyed");
          //console.log(buildingDestroyed);
        }
      }
    }
    if(bdTotalCount === 0) {
      resolve(events);
    }
  });
},

extractPlayersEvents = function(diff, last, cur, callback) {
  var
  events = [],
  tracker = new PromiseTracker();
  try {
    if(diff.scoreboard && ( diff.scoreboard.radiant || diff.scoreboard.dire ) ) {
      for(var t in teams) {
        var
        team = diff.scoreboard[teams[t]],
        lastTeam = (last && last.scoreboard && last.scoreboard[teams[t]]) || {},
        curTeam = (cur && cur.scoreboard && cur.scoreboard[teams[t]]) || {};
        if(team) {
          if(team.players) {
            for(var i = 0; i < team.players.length; i++) {
              if(team.players[i]) {
                var
                player = team.players[i],
                lastPlayer = (lastTeam.players && lastTeam.players[i]) || {},
                curPlayer = (curTeam.players && curTeam.players[i]) || {};

                tracker.addAsyncNonBlocking(extractKDA, player, lastPlayer, curPlayer, curTeam, cur, t, events, tracker);

                tracker.addAsyncNonBlocking(extractItemPickup, player, lastPlayer, curPlayer, curTeam, cur, t, events, tracker);

                tracker.addAsyncNonBlocking(extractAbilitySkilled, player, lastPlayer, curPlayer, curTeam, cur, t, events, tracker);
              }
            }
          }

          tracker.addAsyncNonBlocking(extractBuildingDestroyed, team, lastTeam, curTeam, cur, t, events, tracker);
        }
      }
    }
    tracker.andThen(function() {
      callback(events);
    });
    tracker.onError(function(e) {
      console.log(e.stack);
      callback(events);
    });
  } catch(e) {
    console.log(e.stack);
    callback(events);
  }
};

module.exports = extractEvents;

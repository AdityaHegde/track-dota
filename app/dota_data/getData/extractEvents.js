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
      //loop through types : kills, death, assists
      var tk = types[i];
      if(diffPlayer[tk]) {
        //if there was diff in the type
        var
        kda = {
          //store the match_id, type, duration at which it changed and the amt it changed by
          //also store the hero_id, team, account_id, team_id
          //example query : kills by a player on a hero on dire/radiant by 10mins
          match_id   : cur.match_id,
          type       : i,
          duration   : cur.scoreboard.duration,
          amt        : curPlayer[tk] - lastPlayer[tk],
          hero_id    : curPlayer.hero_id,
          team       : team,
          account_id : curPlayer.account_id,
          //get team_id if it is a registered team, "radiant_team" or "dire_team" is present at root
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
    //create item_id map for the diff and last instances for a player
    //this is to detect moving of items through slots
    for(var j = 0; j < 6; j++) {
      var ik = "item" + j;
      if(diffPlayer[ik]) {
        diffItemMap[diffPlayer[ik]] = 1;
      }
      if(lastPlayer[ik]) {
        lastItemMap[lastPlayer[ik]] = 1;
      }
    }

    //caculate diff between the maps, this will have item_ids that were in diffPlayer and not in lastPlayer
    var itemsDiff = deepKeys.diff(lastItemMap, diffItemMap, {});

    if(itemsDiff) {
      for(var ik in itemsDiff) {
        //add and entry for each item_id in diff
        var itemPickup = {
          //store match_id, item_id, duration at which it was reported as picked up, hero_id, team, account_id, team_id
          //example query : fastest pickup of an item by a player on a hero while on dire/radiant
          match_id   : cur.match_id,
          item_id    : ik,
          duration   : cur.scoreboard.duration,
          hero_id    : curPlayer.hero_id,
          team       : team,
          account_id : curPlayer.account_id,
          //get team_id if it is a registered team, "radiant_team" or "dire_team" is present at root
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
      }

      if(ipTotalCount === 0) {
        resolve(events);
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

      //diff of an array doesnt handle addition of elements
      //[{ability_id : 1}, {ability_id : 3}]  diff  [{ability_id : 1}, {ability_id : 2}, {ability_id : 3}]
      //will give  [undefined, {ability_id : 2}, {ability_id : 3}]
      //so to compare with previous array, we need to maintain a seperate index for it which is <= index for current abilities array
      for(var i = 0, j = 0; i < diffPlayer.abilities.length; i++, j++) {
        var
        lastAbility = lastPlayer.abilities[j],
        curAbility = curPlayer.abilities[i];
        if(diffPlayer.abilities[i]) {
          var
          abilitySkilled = {
            //store match_id, ability_id, ability_level, duration at which it was reported as skilled, hero_id, team, account_id, team_id
            //example query : preffered skill build of a player on a hero
            match_id      : cur.match_id,
            ability_id    : curAbility.ability_id,
            ability_level : curAbility.ability_level,
            duration      : cur.scoreboard.duration,
            hero_id       : curPlayer.hero_id,
            team          : team,
            account_id    : curPlayer.account_id,
            //get team_id if it is a registered team, "radiant_team" or "dire_team" is present at root
            team_id       : cur[teams[team] + "_team"] ? cur[teams[team] + "_team"].team_id : 0,
          },
          createAbilitySkilled = 1;
          if(lastAbility) {
            if(lastAbility.ability_id !== curAbility.ability_id) {
              //ability_id of lastAbility is not equal to ability_id of curAbility
              //then the curAbility is a new ability skilled
              //decrement j to offset this addition
              j--;
            }
            else if(lastAbility.ability_level === curAbility.ability_level) {
              //else if ability_level of lastAbility is equal to ability_level of curAbility
              //then it is defined cos a new ability was added before this
              //dont add the curAbility in this case
              createAbilitySkilled = 0;
            }
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
                resolve(events);
              }
            });
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
      //loop through all buildingsTypes : tower, barracks
      var
      bty = buildingsTypes[i],
      bkey = bty + "_state",
      //caculate the change in the building status
      //using XOR for this
      bdiff = lastTeam[bkey] ^ curTeam[bkey];

      for(var j = 0, bit = 1; j < buildingsSubtypes[i]; j++, bit *= 2) {
        //loop through all bits in that buildingType
        //11 for towers, 6 for barracks
        var
        present = bdiff & bit;

        if(present) {
          var
          buildingDestroyed = {
            //store the match_id, team, team_id, type, subtype and duration it was reported as destroyed
            //example query : fasted barracks destroyed by a team on radiant/dire
            match_id : cur.match_id,
            team     : team,
            //get team_id if it is a registered team, "radiant_team" or "dire_team" is present at root
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
    if(diff.scoreboard) {
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

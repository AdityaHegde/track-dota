var
teams = ["radiant", "dire"],

assignNonHeroSkills = function(players, abilities, nonHeroSkills, lastIdxForPlayer, curIdxForPlayer) {
  if(nonHeroSkills.length > 0 && curIdxForPlayer - lastIdxForPlayer === nonHeroSkills.length) {
    //if there are same no of nonHeroSkills as no of players skipped, assign the blocks to players in order
    for(var i = 0; i < nonHeroSkills.length; i++) {
      players[lastIdxForPlayer + i].abilities = abilities[nonHeroSkills[i]];
    }
  }
},

correctAbilities = function(rawData, data, abilitiesMap) {
  //extract all blocks of "abilities" in sets
  var
  abilityGroups = rawData.match(/((?:\s*"abilities"\s*:\s*(\[(?:.|\n)*?\]),?\n)+)/g);
  for(var i = 0; i < abilityGroups.length; i++) {
    abilityGroups[i] = abilityGroups[i].match(/"abilities"\s*:\s*(\[(?:.|\n)*?\])/g);
    for(var j = 0; j < abilityGroups[i].length; j++) {
      abilityGroups[i][j] = abilityGroups[i][j].replace(/"abilities"\s*:\s*/ ,"");
      abilityGroups[i][j] = abilityGroups[i][j].replace(/,\s*$/ ,"");
      abilityGroups[i][j] = JSON.parse(abilityGroups[i][j]);
    }
  }

  if(abilityGroups) {
    var
    curGroupIdx = 0;
    for(var i = 0; i < data.length; i++) {
      if(data[i].scoreboard) {
        for(var t = 0; t < teams.length; t++) {
          //console.log("team : " + t);
          if(data[i].scoreboard[teams[t]] && data[i].scoreboard[teams[t]].abilities) {
            //console.log("curGroupIdx : " + curGroupIdx);
            //find the index of last ability block in the team
            //(JSON always retains the last value assigned, in this case last block of ability in a team)
            var
            abilities = abilityGroups[curGroupIdx++],
            nonHeroSkills = [],
            lastIdxForPlayer = -1;

            //loop through ability blocks from index of last block of ability of last process team + 1
            //to index of last block of ability in the current team
            for(var j = 0, k = 0; j < abilities.length; ) {
              //console.log(j + " : " + k);
              //console.log(abilities[j]);
              var
              hero_id = data[i].scoreboard[teams[t]].players[k].hero_id,
              foundHeroId = -1;

              //check if any of the ability is for a hero specifically
              for(var a = 0; a < abilities[j].length; a++) {
                if(abilitiesMap[abilities[j][a].ability_id].hero_id) {
                  foundHeroId = abilitiesMap[abilities[j][a].ability_id].hero_id;
                  break;
                }
              }

              //console.log("foundHeroId : " + foundHeroId);
              if(foundHeroId == hero_id) {
                //if hero_id of current player is equal to found hero_id, assign the block of ability to the player
                data[i].scoreboard[teams[t]].players[k].abilities = abilities[j];

                assignNonHeroSkills(data[i].scoreboard[teams[t]].players, abilities, nonHeroSkills, lastIdxForPlayer, k);
                //reset blocks of non hero skills
                nonHeroSkills = [];

                j++;
              }
              else if(foundHeroId === -1) {
                //if there is no hero specific skill (Stats ability is one example),
                //store the non hero skills in an array
                if(nonHeroSkills.length === 0) {
                  //if this is the 1st non hero skills in the block then store the index of the player where it began
                  lastIdxForPlayer = k;
                }
                nonHeroSkills.push(j);
                j++;
              }

              //if there is a hero specific skill and the current player's hero doesnt match
              //then the current player is holding his skill points so move to next player but stay in current ability block
              k++;
            }
            assignNonHeroSkills(data[i].scoreboard[teams[t]].players, abilities, nonHeroSkills, lastIdxForPlayer, data[i].scoreboard[teams[t]].players.length);

            delete data[i].scoreboard[teams[t]].abilities;
            //console.log("End team : " + t);
          }
        }
      }
    }
  }
};

module.exports = correctAbilities;

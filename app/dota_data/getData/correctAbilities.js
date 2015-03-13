var
teams = ["radiant", "dire"],

correctAbilities = function(rawData, data, abilitiesMap) {
  //extract all blocks of "abilities"
  var
  abilities = rawData.match(/"abilities"\s*:\s*(\[(?:.|\n)*?\])/g),
  abilitiesObjMap = {},
  abilitiesObjs = [];

  if(abilities) {
    //create a map of string version of each ability block to its index in the array of blocks
    for(var i = 0; i < abilities.length; i++) {
      var
      abilArr = abilities[i].replace(/"abilities"\s*:\s*/ ,""),
      abilArrObj = JSON.parse(abilArr),
      abilArrKey = JSON.stringify(abilArrObj);
      abilitiesObjMap[abilArrKey] = i;
      abilitiesObjs.push(abilArrObj);
    }

    var lastPlayerBlock = 0;
    for(var i = 0; i < data.length; i++) {
      if(data[i].scoreboard) {
        for(var t = 0; t < teams.length; t++) {
          if(data[i].scoreboard[teams[t]] && data[i].scoreboard[teams[t]].abilities) {
            //find the index of last ability block in the team
            //(JSON always retains the last value assigned, in this case last block of ability in a team)
            var
            abilArrKey = JSON.stringify(data[i].scoreboard[teams[t]].abilities),
            abilArrIdx = abilitiesObjMap[abilArrKey],
            nonHeroSkills = [],
            lastIdxForPlayer = -1;

            //loop through ability blocks from index of last block of ability of last process team + 1
            //to index of last block of ability in the current team
            for(var j = lastPlayerBlock, k = 0; j <= abilArrIdx; ) {
              var
              hero_id = data[i].scoreboard[teams[t]].players[k].hero_id,
              foundHeroId = -1;

              //check if any of the ability is for a hero specifically
              for(var a = 0; a < abilitiesObjs[j].length; a++) {
                if(abilitiesMap[abilitiesObjs[j][a].ability_id].hero_id) {
                  foundHeroId = abilitiesMap[abilitiesObjs[j][a].ability_id].hero_id;
                  break;
                }
              }

              if(foundHeroId == hero_id) {
                //if hero_id of current player is equal to found hero_id, assign the block of ability to the player
                data[i].scoreboard[teams[t]].players[k].abilities = abilitiesObjs[j];

                if(nonHeroSkills.length > 0 && k - lastIdxForPlayer === nonHeroSkills.length) {
                  //if there are same no of nonHeroSkills as no of players skipped, assign the blocks to players in order
                  for(var nh = 0; nh < nonHeroSkills.length; nh++) {
                    data[i].scoreboard[teams[t]].players[lastIdxForPlayer + nh].abilities = abilitiesObjs[nonHeroSkills[nh]];
                  }
                }
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

            delete data[i].scoreboard[teams[t]].abilities;
            lastPlayerBlock = abilArrIdx + 1;
          }
        }
      }
    }
  }
};

module.exports = correctAbilities;

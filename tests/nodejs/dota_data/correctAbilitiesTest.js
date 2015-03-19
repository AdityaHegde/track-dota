var
correctAbilities = require("../../../app/dota_data/getData/correctAbilities"),
readFile = require("fs").readFile,
assert = require("assert"),
ablitiesMap = {
  "1" : {
  },
  "10" : {
    hero_id : "1",
  },
  "20" : {
    hero_id : "2",
  },
  "30" : {
    hero_id : "3",
  },
  "40" : {
    hero_id : "4",
  },
  "50" : {
    hero_id : "5",
  },
  "60" : {
    hero_id : "6",
  },
  "70" : {
    hero_id : "7",
  },
  "80" : {
    hero_id : "8",
  },
  "90" : {
    hero_id : "9",
  },
  "100" : {
    hero_id : "10",
  },
},
resultPlayers = [{
  radiant : [{
    "player_slot": 1,
    "hero_id": 1,
    "abilities" : [{
      "ability_id" : 1,
      "ability_level" : 1
    }, {
      "ability_id" : 10,
      "ability_level" : 1
    }],
  }, {
    "player_slot": 2,
    "hero_id": 2,
    "abilities" : [{
      "ability_id" : 1,
      "ability_level" : 1
    }],
  }, {
    "player_slot": 3,
    "hero_id": 3,
    "abilities" : [{
      "ability_id" : 1,
      "ability_level" : 1
    }],
  }, {
    "player_slot": 4,
    "hero_id": 4,
    "abilities" : [{
      "ability_id" : 40,
      "ability_level" : 1
    }],
  }, {
    "player_slot": 5,
    "hero_id": 5,
  }],
  dire : [{
    "player_slot": 1,
    "hero_id": 6,
    "abilities" : [{
      "ability_id" : 60,
      "ability_level" : 1
    }],
  }, {
    "player_slot": 2,
    "hero_id": 7,
  }, {
    "player_slot": 3,
    "hero_id": 8,
  }, {
    "player_slot": 4,
    "hero_id": 9,
    "abilities" : [{
      "ability_id" : 90,
      "ability_level" : 1
    }],
  }, {
    "player_slot": 5,
    "hero_id": 10,
  }],
}, {
  radiant : [{
    "player_slot": 1,
    "hero_id": 1,
  }, {
    "player_slot": 2,
    "hero_id": 2,
  }, {
    "player_slot": 3,
    "hero_id": 3,
  }, {
    "player_slot": 4,
    "hero_id": 4,
  }, {
    "player_slot": 5,
    "hero_id": 5,
  }],
  dire : [{
    "player_slot": 1,
    "hero_id": 6,
    "abilities" : [{
      "ability_id" : 1,
      "ability_level" : 1
    }],
  }, {
    "player_slot": 2,
    "hero_id": 7,
    "abilities" : [{
      "ability_id" : 70,
      "ability_level" : 1
    }],
  }, {
    "player_slot": 3,
    "hero_id": 8,
    "abilities" : [{
      "ability_id" : 1,
      "ability_level" : 1
    }],
  }, {
    "player_slot": 4,
    "hero_id": 9,
    "abilities" : [{
      "ability_id" : 90,
      "ability_level" : 1
    }],
  }, {
    "player_slot": 5,
    "hero_id": 10,
    "abilities" : [{
      "ability_id" : 1,
      "ability_level" : 1
    }],
  }],
}];

describe("correctAbilities", function() {
  it("sanity test", function(done) {
    readFile("tests/nodejs/dota_data/correctAbilitiesData.json", "utf8", function(err, data) {
      if(err) done(err);
      else {
        try {
          var
          games = JSON.parse(data).result.games;
          correctAbilities(data, games, ablitiesMap);

          for(var i = 0; i < resultPlayers.length; i++) {
            var
            radiantPlayers = games[i].scoreboard.radiant.players,
            direPlayers = games[i].scoreboard.dire.players;
            assert.deepEqual(radiantPlayers, resultPlayers[i].radiant);
            assert.deepEqual(direPlayers, resultPlayers[i].dire);
          }

          done();
        } catch(err) {
          console.log(err);
          done(err);
        }
      }
    });
  });
});

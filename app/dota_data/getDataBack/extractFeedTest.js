var
extractEvents = require("./extractEvents"),
mongo = require("../../lib/mongodb_data_adaptor"),

last = {
  match_id : 123,
  players : [{
    account_id : 1,
    hero_id : 1,
    team : 0,
  }, {
    account_id : 2,
    hero_id : 2,
    team : 0,
  }, {
    account_id : 3,
    hero_id : 3,
    team : 1,
  }, {
    account_id : 4,
    hero_id : 4,
    team : 1,
  }],
  radiant_team : {
    team_id : 1,
  },
  dire_team : {
    team_id : 2,
  },
  scoreboard : {
    duration : 123,
    radiant : {
      tower_state : 1972,
      barracks_state : 63,
      players : [{
        hero_id: 1,
        kills : 1,
        death : 0,
        assists : 1,
        item0: 0,
        item1: 1,
        item2: 2,
        item3: 0,
        item4: 0,
        item5: 0,
        net_worth : 100,
        gold : 100,
        abilities : [{
          ability_id : 1,
          ability_level : 1,
        }, {
          ability_id : 2,
          ability_level : 1,
        }],
      }, {
        hero_id: 2,
        kills : 1,
        death : 0,
        assists : 1,
        item0: 0,
        item1: 1,
        item2: 0,
        item3: 2,
        item4: 0,
        item5: 0,
        net_worth : 100,
        gold : 100,
        abilities : [{
          ability_id : 11,
          ability_level : 1,
        }, {
          ability_id : 13,
          ability_level : 1,
        }],
      }],
    },
    dire : {
      tower_state : 1972,
      barracks_state : 63,
      players : [{
        hero_id: 3,
        kills : 0,
        death : 2,
        assists : 0,
        item0: 0,
        item1: 1,
        item2: 2,
        item3: 0,
        item4: 0,
        item5: 0,
        net_worth : 100,
        gold : 100,
        abilities : [{
          ability_id : 31,
          ability_level : 1,
        }, {
          ability_id : 32,
          ability_level : 1,
        }],
      }, {
        hero_id: 4,
        kills : 0,
        death : 0,
        assists : 0,
        item0: 0,
        item1: 1,
        item2: 0,
        item3: 2,
        item4: 0,
        item5: 0,
        net_worth : 100,
        gold : 100,
        abilities : [{
          ability_id : 41,
          ability_level : 1,
        }, {
          ability_id : 43,
          ability_level : 1,
        }],
      }],
    },
  },
},
cur = {
  match_id : 123,
  players : [{
    account_id : 1,
    hero_id : 1,
    team : 0,
  }, {
    account_id : 2,
    hero_id : 2,
    team : 0,
  }, {
    account_id : 3,
    hero_id : 3,
    team : 1,
  }, {
    account_id : 4,
    hero_id : 4,
    team : 1,
  }],
  radiant_team : {
    team_id : 1,
  },
  dire_team : {
    team_id : 2,
  },
  scoreboard : {
    duration : 127,
    radiant : {
      tower_state : 1588,
      barracks_state : 47,
      players : [{
        hero_id: 1,
        kills : 1,
        death : 1,
        assists : 1,
        item0: 0,
        item1: 1,
        item2: 0,
        item3: 2,
        item4: 0,
        item5: 0,
        net_worth : 50,
        gold : 50,
        abilities : [{
          ability_id : 1,
          ability_level : 2,
        }, {
          ability_id : 2,
          ability_level : 1,
        }],
      }, {
        hero_id: 2,
        kills : 1,
        death : 0,
        assists : 1,
        item0: 0,
        item1: 1,
        item2: 0,
        item3: 3,
        item4: 2,
        item5: 0,
        net_worth : 100,
        gold : 100,
        abilities : [{
          ability_id : 11,
          ability_level : 1,
        }, {
          ability_id : 12,
          ability_level : 1,
        }, {
          ability_id : 13,
          ability_level : 1,
        }],
      }],
    },
    dire : {
      tower_state : 1956,
      barracks_state : 63,
      players : [{
        hero_id: 3,
        kills : 1,
        death : 2,
        assists : 0,
        item0: 0,
        item1: 1,
        item2: 2,
        item3: 0,
        item4: 0,
        item5: 0,
        net_worth : 150,
        gold : 150,
        abilities : [{
          ability_id : 31,
          ability_level : 1,
        }, {
          ability_id : 32,
          ability_level : 1,
        }],
      }, {
        hero_id: 4,
        kills : 0,
        death : 0,
        assists : 1,
        item0: 0,
        item1: 1,
        item2: 0,
        item3: 2,
        item4: 3,
        item5: 0,
        net_worth : 125,
        gold : 125,
        abilities : [{
          ability_id : 41,
          ability_level : 1,
        }, {
          ability_id : 42,
          ability_level : 1,
        }, {
          ability_id : 43,
          ability_level : 2,
        }],
      }],
    },
  },
};

extractEvents(last, cur, function(events) {
  console.log(events);
});

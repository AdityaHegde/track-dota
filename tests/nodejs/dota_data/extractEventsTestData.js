module.exports = [{
  title : "No diff",
  last  : {
    match_id : 1,
    radiant_team : {
      team_id : 1,
    },
    scoreboard : {
      duration : 0,
      radiant : {
        players : [{
          account_id : 1,
          hero_id    : 1,
          kills      : 0,
          death      : 1,
          assists    : 1,
        }],
      },
    },
  },
  cur : {
    match_id : 1,
    radiant_team : {
      team_id : 1,
    },
    scoreboard : {
      duration : 0,
      radiant : {
        players : [{
          account_id : 1,
          hero_id    : 1,
          kills      : 0,
          death      : 1,
          assists    : 1,
        }],
      },
    },
  },
  events : [],
}, {
  title : "No diff in scoreboard",
  last  : {
    match_id : 1,
    radiant_team : {
      team_id : 1,
    },
    spectators : 12,
    scoreboard : {
      duration : 0,
      radiant : {
        players : [{
          account_id : 1,
          hero_id    : 1,
          kills      : 0,
          death      : 1,
          assists    : 1,
        }],
      },
    },
  },
  cur : {
    match_id : 1,
    radiant_team : {
      team_id : 1,
    },
    spectators : 123,
    scoreboard : {
      duration : 0,
      radiant : {
        players : [{
          account_id : 1,
          hero_id    : 1,
          kills      : 0,
          death      : 1,
          assists    : 1,
        }],
      },
    },
  },
  events : [],
}, {
  title : "No diff in teams",
  last  : {
    match_id : 1,
    radiant_team : {
      team_id : 1,
    },
    scoreboard : {
      duration : 0,
      radiant : {
        players : [{
          account_id : 1,
          hero_id    : 1,
          kills      : 0,
          death      : 1,
          assists    : 1,
        }],
      },
    },
  },
  cur : {
    match_id : 1,
    radiant_team : {
      team_id : 1,
    },
    scoreboard : {
      duration : 1,
      radiant : {
        players : [{
          account_id : 1,
          hero_id    : 1,
          kills      : 0,
          death      : 1,
          assists    : 1,
        }],
      },
    },
  },
  events : [],
}, {
  title : "Diff in only one player",
  last  : {
    match_id : 1,
    radiant_team : {
      team_id : 1,
    },
    scoreboard : {
      duration : 0,
      radiant : {
        players : [{
          account_id : 1,
          hero_id    : 1,
          kills      : 0,
          death      : 0,
          assists    : 0,
        }, {
          account_id : 2,
          hero_id    : 2,
          kills      : 0,
          death      : 0,
          assists    : 0,
        }],
      },
    },
  },
  cur : {
    match_id : 1,
    radiant_team : {
      team_id : 1,
    },
    scoreboard : {
      duration : 1,
      radiant : {
        players : [{
          account_id : 1,
          hero_id    : 1,
          kills      : 0,
          death      : 0,
          assists    : 0,
        }, {
          account_id : 2,
          hero_id    : 2,
          kills      : 0,
          death      : 1,
          assists    : 0,
        }],
      },
    },
  },
  events : [{
    type : "kda",
    obj  : {
      match_id   : 1,
      type       : 1,
      duration   : 1,
      amt        : 1,
      hero_id    : 2,
      team       : 0,
      account_id : 2,
      team_id    : 1,
    },
  }],
}, {
  title : "Radiant with kda, team info",
  last  : {
    match_id : 1,
    radiant_team : {
      team_id : 1,
    },
    scoreboard : {
      duration : 122,
      radiant : {
        players : [{
          account_id : 1,
          hero_id    : 1,
          kills      : 0,
          death      : 1,
          assists    : 1,
        }],
      },
    },
  },
  cur : {
    match_id : 1,
    radiant_team : {
      team_id : 1,
    },
    scoreboard : {
      duration : 123,
      radiant : {
        players : [{
          account_id : 1,
          hero_id    : 1,
          kills      : 1,
          death      : 2,
          assists    : 3,
        }],
      },
    },
  },
  events : [{
    type : "kda",
    obj  : {
      match_id   : 1,
      type       : 0,
      duration   : 123,
      amt        : 1,
      hero_id    : 1,
      team       : 0,
      account_id : 1,
      team_id    : 1,
    },
  }, {
    type : "kda",
    obj  : {
      match_id   : 1,
      type       : 1,
      duration   : 123,
      amt        : 1,
      hero_id    : 1,
      team       : 0,
      account_id : 1,
      team_id    : 1,
    },
  }, {
    type : "kda",
    obj  : {
      match_id   : 1,
      type       : 2,
      duration   : 123,
      amt        : 2,
      hero_id    : 1,
      team       : 0,
      account_id : 1,
      team_id    : 1,
    },
  }],
}, {
  title : "Dire with kda, without team info",
  last : {
    match_id : 2,
    scoreboard : {
      duration : 11,
      dire : {
        players : [{
          account_id : 2,
          hero_id    : 2,
          kills      : 0,
          death      : 0,
          assists    : 0,
        }],
      },
    },
  },
  cur : {
    match_id : 2,
    scoreboard : {
      duration : 12,
      dire : {
        players : [{
          account_id : 2,
          hero_id    : 2,
          kills      : 1,
          death      : 0,
          assists    : 2,
        }],
      },
    },
  },
  events : [{
    type : "kda",
    obj  : {
      match_id   : 2,
      type       : 0,
      duration   : 12,
      amt        : 1,
      hero_id    : 2,
      team       : 1,
      account_id : 2,
      team_id    : 0,
    },
  }, {
    type : "kda",
    obj  : {
      match_id   : 2,
      type       : 2,
      duration   : 12,
      amt        : 2,
      hero_id    : 2,
      team       : 1,
      account_id : 2,
      team_id    : 0,
    },
  }],
}, {
  title : "Item pickup no change, moved item",
  last : {
    match_id : 2,
    scoreboard : {
      duration : 11,
      dire : {
        players : [{
          account_id : 2,
          hero_id    : 2,
          item0      : 0,
          item1      : 1,
          item2      : 0,
          item3      : 2,
          item4      : 0,
          item5      : 0,
        }],
      },
    },
  },
  cur : {
    match_id : 2,
    scoreboard : {
      duration : 12,
      dire : {
        players : [{
          account_id : 2,
          hero_id    : 2,
          item0      : 0,
          item1      : 1,
          item2      : 2,
          item3      : 0,
          item4      : 0,
          item5      : 0,
        }],
      },
    },
  },
  events : [],
}, {
  title : "Item pickup added item",
  last : {
    match_id : 2,
    scoreboard : {
      duration : 11,
      dire : {
        players : [{
          account_id : 2,
          hero_id    : 2,
          item0      : 0,
          item1      : 1,
          item2      : 0,
          item3      : 2,
          item4      : 0,
          item5      : 0,
        }],
      },
    },
  },
  cur : {
    match_id : 2,
    scoreboard : {
      duration : 12,
      dire : {
        players : [{
          account_id : 2,
          hero_id    : 2,
          item0      : 0,
          item1      : 1,
          item2      : 2,
          item3      : 0,
          item4      : 3,
          item5      : 0,
        }],
      },
    },
  },
  events : [{
    type : "itemPickup",
    obj  : {
      match_id   : 2,
      item_id    : 3,
      duration   : 12,
      hero_id    : 2,
      team       : 1,
      account_id : 2,
      team_id    : 0,
    },
  }],
}, {
  title : "Ability skilled, level change",
  last : {
    match_id : 2,
    scoreboard : {
      duration : 11,
      dire : {
        players : [{
          account_id : 2,
          hero_id    : 2,
          abilities  : [{
            ability_id : 1,
            ability_level : 1,
          }, {
            ability_id : 2,
            ability_level : 1,
          }],
        }],
      },
    },
  },
  cur : {
    match_id : 2,
    scoreboard : {
      duration : 12,
      dire : {
        players : [{
          account_id : 2,
          hero_id    : 2,
          abilities  : [{
            ability_id : 1,
            ability_level : 1,
          }, {
            ability_id : 2,
            ability_level : 2,
          }],
        }],
      },
    },
  },
  events : [{
    type : "abilitySkilled",
    obj  : {
      ability_id    : 2,
      ability_level : 2,
      match_id      : 2,
      duration      : 12,
      hero_id       : 2,
      team          : 1,
      account_id    : 2,
      team_id       : 0,
    },
  }],
}, {
  title : "Ability skilled, level added",
  last : {
    match_id : 2,
    scoreboard : {
      duration : 11,
      dire : {
        players : [{
          account_id : 2,
          hero_id    : 2,
          abilities  : [{
            ability_id : 1,
            ability_level : 1,
          }, {
            ability_id : 3,
            ability_level : 1,
          }],
        }],
      },
    },
  },
  cur : {
    match_id : 2,
    scoreboard : {
      duration : 12,
      dire : {
        players : [{
          account_id : 2,
          hero_id    : 2,
          abilities  : [{
            ability_id : 1,
            ability_level : 1,
          }, {
            ability_id : 2,
            ability_level : 1,
          }, {
            ability_id : 3,
            ability_level : 1,
          }, {
            ability_id : 4,
            ability_level : 1,
          }],
        }],
      },
    },
  },
  events : [{
    type : "abilitySkilled",
    obj  : {
      ability_id    : 2,
      ability_level : 1,
      match_id      : 2,
      duration      : 12,
      hero_id       : 2,
      team          : 1,
      account_id    : 2,
      team_id       : 0,
    },
  }, {
    type : "abilitySkilled",
    obj  : {
      ability_id    : 4,
      ability_level : 1,
      match_id      : 2,
      duration      : 12,
      hero_id       : 2,
      team          : 1,
      account_id    : 2,
      team_id       : 0,
    },
  }],
}, {
  title : "Radiant tower destroyed",
  last : {
    match_id : 1,
    radiant_team : {
      team_id : 1,
    },
    scoreboard : {
      duration : 11,
      radiant : {
        tower_state : 2047,
        barracks_state : 63,
        players : [{
          account_id : 1,
          hero_id    : 1,
        }],
      },
    },
  },
  cur : {
    match_id : 1,
    radiant_team : {
      team_id : 1,
    },
    scoreboard : {
      duration : 12,
      radiant : {
        tower_state : 2038,
        barracks_state : 63,
        players : [{
          account_id : 1,
          hero_id    : 1,
        }],
      },
    },
  },
  events : [{
    type : "buildingDestroyed",
    obj  : {
      match_id : 1,
      team     : 0,
      team_id  : 1,
      type     : 0,
      subtype  : 0,
      duration : 12,
    },
  }, {
    type : "buildingDestroyed",
    obj  : {
      match_id : 1,
      team     : 0,
      team_id  : 1,
      type     : 0,
      subtype  : 3,
      duration : 12,
    },
  }],
}, {
  title : "Dire barracks destroyed",
  last : {
    match_id : 1,
    scoreboard : {
      duration : 11,
      dire : {
        tower_state : 1984,
        barracks_state : 63,
        players : [{
          account_id : 1,
          hero_id    : 1,
        }],
      },
    },
  },
  cur : {
    match_id : 1,
    scoreboard : {
      duration : 12,
      dire : {
        tower_state : 1984,
        barracks_state : 52,
        players : [{
          account_id : 1,
          hero_id    : 1,
        }],
      },
    },
  },
  events : [{
    type : "buildingDestroyed",
    obj  : {
      match_id : 1,
      team     : 1,
      team_id  : 0,
      type     : 1,
      subtype  : 0,
      duration : 12,
    },
  }, {
    type : "buildingDestroyed",
    obj  : {
      match_id : 1,
      team     : 1,
      team_id  : 0,
      type     : 1,
      subtype  : 1,
      duration : 12,
    },
  }, {
    type : "buildingDestroyed",
    obj  : {
      match_id : 1,
      team     : 1,
      team_id  : 0,
      type     : 1,
      subtype  : 3,
      duration : 12,
    },
  }],
}];

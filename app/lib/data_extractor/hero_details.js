var
parser = require("./parser");

module.exports = function(options, callback) {
  if(!options.selector) {
    options.selector = ["#centerColContent", "#overviewPrimaryStats", ".abilitiesInsetBoxContent"];
  }
  parser(options, function(err, data, $) {
    if(err) {
      console.log(err);
    }
    else {
      var
      hero_bioDiv = $(data[0]),
      hero_roles = hero_bioDiv.find("#heroBioRoles").text(),
      hero_statsDiv = $(data[1]),
      abilities = [],
      abilitiesDivs = $(data[2]),
      hero_details = {
        name : hero_bioDiv.find("h1").text(),
      };

      hero_details.attackType = hero_bioDiv.find(".bioTextAttack").text();
      hero_roles = hero_roles.split(" - ");
      hero_roles.shift();
      hero_details.roles = hero_roles;

      hero_details.int = hero_statsDiv.find("#overview_IntVal").text();
      hero_details.agi = hero_statsDiv.find("#overview_AgiVal").text();
      hero_details.str = hero_statsDiv.find("#overview_StrVal").text();
      hero_details.dam = hero_statsDiv.find("#overview_AttackVal").text();
      hero_details.spd = hero_statsDiv.find("#overview_SpeedVal").text();
      hero_details.arm = hero_statsDiv.find("#overview_DefenseVal").text();

      for(var i = 0; i < abilitiesDivs.length; i++) {
        var
        jqDiv = $(abilitiesDivs[i]),
        imgDiv = jqDiv.find(".overviewAbilityImg")[0],
        id = imgDiv.getAttribute("abilityname"),
        img = imgDiv.getAttribute("src"),
        name = jqDiv.find(".abilityHeaderRowDescription h2").text(),
        desc = jqDiv.find(".abilityHeaderRowDescription p").text(),
        cooldown = jqDiv.find(".cooldown").text(),
        ability = {
          name       : name,
          ability_id : id,
          img        : img,
          desc       : desc,
        };
        cooldown = cooldown && cooldown.match(/^\s*Cooldown\s*:\s*(.*)$/);
        cooldown = cooldown && cooldown[1];
        if(cooldown) {
          var cooldowns = cooldown.split(/\//);
          ability.cooldowns = cooldowns;
        }
        else {
          ability.isPassive = true;
        }

        if(i === abilitiesDivs.length - 1) {
          ability.isUlti = true;
        }

        abilities.push(ability);
      }
      hero_details.abilities = abilities;

      callback(null, hero_details);
    }
  });
};

/*module.exports({
  url : "http://www.dota2.com/hero/Earthshaker/",
  selector : ["#heroBioRoles", "#overviewPrimaryStats", ".abilitiesInsetBoxContent"],
}, function(err, h) {
  console.log(h);
});*/

define([
  "ember",
  "./app",
], function(Ember, Dota) {

Dota.IndexController = Ember.Controller.extend({
});

Dota.GameController = Ember.Controller.extend({
  lineone : function() {
    var players = this.get("model.players"), lineone = [];
    if(players.get("length") >= 3) {
      lineone.pushObject(players.objectAt(0));
      lineone.pushObject(players.objectAt(1));
      lineone.pushObject(players.objectAt(2));
    }
    return lineone;
  }.property("model.players.@each"),
  linetwo : function() {
    var players = this.get("model.players"), linetwo = [];
    if(players.get("length") >= 5) {
      linetwo.pushObject(players.objectAt(3));
      linetwo.pushObject(players.objectAt(4));
    }
    return linetwo;
  }.property("model.players.@each"),
});

Dota.PlayerController = Ember.Controller.extend({
  selectedHero : function(key, value) {
    if(arguments.length > 1) {
      var model = this.get("model"), hero = this.store.getById("hero", value),
          heroInstance = CrudAdapter.createRecordWrapper(this.store, "hero-instance", {
            name : hero.get("name"),
            hero : hero,
            player : model,
          });
      hero.get("abilities").then(function(abilities) {
        abilities.forEach(function(ability) {
          this.addToProp("abilityInstances", CrudAdapter.createRecordWrapper(this.store, "ability-instance", {
            name : ability.get("name"),
            level : 0,
            cooldown : -1,
            ability : ability,
            heroInstance : this,
          }));
        }, heroInstance);
      });
      model.set("heroInstance", heroInstance);
      return value;
    }
  }.property(),
});

Dota.HeroController = Ember.Controller.extend({
});

Dota.AbilityController = Ember.Controller.extend({
  actions : {
    takeLevel : function(level) {
      var curLevel = this.get("model.level");
      if(curLevel === level) {
        this.set("model.level", 0);
      }
      else {
        this.set("model.level", level);
      }
    },

    cast : function() {
      var model = this.get("model"), level = model.get("level");
      if(level > 0 && this.get("model.ability.hasCooldown")) {
        model.set("cooling", true);
        model.set("timeLeft", model.get("cooldown"));
        Timer.TimerObj.create({
          count : model.get("cooldown"), 
          timeout : 1000,
          timerCallback : function() {
            model.set("timeLeft", model.get("timeLeft") - 1);
          },
          endCallback : function() {
            model.set("cooling", false);
          }
        });
      }
    },
  },
});

});

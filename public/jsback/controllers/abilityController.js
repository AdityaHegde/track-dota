define([
  "ember",
  "../app",
], function(Ember, Dota) {

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

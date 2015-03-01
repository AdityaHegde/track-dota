define([
  "ember",
  "../app",
], function(Ember, Dota) {

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

});

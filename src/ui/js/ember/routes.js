Dota.IndexRoute = Ember.Route.extend({
  model : function(params, transtion) {
    return this.store.findAll("hero");
  },

  afterModel : function(model) {
    Ember.set("Dota.GlobalData.heros", model);
  },
});

Dota.GameRoute = Ember.Route.extend({
  model : function(params, transtion) {
    return this.store.createRecord("game");
  },

  afterModel : function(model) {
    for(var i = 0; i < 5; i++) {
      model.addToProp('players', this.store.createRecord("player", {
        name : "a"+i,
      }));
    }
  },
});

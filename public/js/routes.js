define([
  "ember",
  "./app",
], function(Ember, Dota) {

Dota.IndexRoute = Ember.Route.extend({
  model : function(params, transtion) {
    return this.store.findAll("hero");
  },

  afterModel : function(model) {
    Ember.set("CrudAdapter.GlobalData.heros", model);
  },
});

Dota.GameRoute = Ember.Route.extend({
  model : function(params, transtion) {
    var game = CrudAdapter.createRecordWrapper(this.store, "game", {});
    for(var i = 0; i < 5; i++) {
      game.addToProp('players', CrudAdapter.createRecordWrapper(this.store, "player", {
        name : "a"+i,
      }));
    }
    return game;
  },
});

});

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
    var meta = this.store.metadataFor("hero");
    if(meta.user) {
      model.set("profile", CrudAdapter.createRecordWrapper(this.store, "profile", meta.user));
    }
  },
});

Dota.LoginRoute = Ember.Route.extend({
  model : function(params, transtion) {
    return CrudAdapter.createRecordWrapper(this.store, "profile", {});
  },
});

Dota.SignupRoute = Ember.Route.extend({
  model : function(params, transtion) {
    return CrudAdapter.createRecordWrapper(this.store, "profile", {});
  },
});

Dota.ChatRoute = Ember.Route.extend({
  model : function(params, transtion) {
    if(!Ember.get("CrudAdapter.GlobalData.heros.profile")) {
      this.transitionTo("login");
    }
    return [];
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

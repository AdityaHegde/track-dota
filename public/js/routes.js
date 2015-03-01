define([
  "ember",
  "./app",
], function(Ember, Dota) {

Dota.IndexRoute = Ember.Route.extend({
  model : function(params, transtion) {
    return new Ember.RSVP.Promise(function(resolve, reject) {
      $.ajax({
        url : "/dotadata/getStaticData",
        dataType : "json",
      }).then(function(data) {
        Ember.run(function() {
          resolve(data);
        });
      }, function(err) {
        Ember.run(function() {
          reject(err);
        });
      });
    });
  },

  afterModel : function(model) {
    var dataTypes = {
      heroes : Dota.HeroObject,
      items  : Dota.ItemObject,
    };
    for(var d in dataTypes) {
      var darr = [];
      for(var i = 0; i < model.result.data[d].length; i++) {
        darr.pushObject(dataTypes[d].create(model.result.data[d][i]));
      }
      Ember.set("CrudAdapter.GlobalData." + d, darr);
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

Dota.GameRoute = Ember.Route.extend({
  model : function(params, transtion) {
    return [];
  },
});

});

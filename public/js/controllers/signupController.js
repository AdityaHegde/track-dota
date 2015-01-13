define([
  "ember",
  "../app",
  "ember-utils",
], function(Ember, Dota) {

Dota.SignupController = BaseController.BaseController.extend({
  columnDataGroupName : "signup",

  actions : {
    signup : function() {
      var profile = this.get("model"), that = this;
      Dota.Profile.customApiMap.create = "/signup";
      CrudAdapter.saveRecord(profile).then(function(profile) {
        CrudAdapter.GlobalData.set("heros.profile", profile);
        that.transitionToRoute("index");
      }, function(message) {
        console.log(message);
      });
    },
  },
});

});

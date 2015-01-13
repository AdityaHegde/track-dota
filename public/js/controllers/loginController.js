define([
  "ember",
  "../app",
  "ember-utils",
], function(Ember, Dota) {

Dota.LoginController = BaseController.BaseController.extend({
  columnDataGroupName : "login",

  profile_id : "",
  pwd : "",

  actions : {
    login : function() {
      var profile = this.get("model"), that = this;
      Dota.Profile.customApiMap.create = "/login";
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

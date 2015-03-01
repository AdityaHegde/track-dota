define([
  "ember",
  "../app",
  "ember-utils-core",
], function(Ember, Dota, Utils) {

CrudAdapter.APIConfig.API_BASE = "data/v1/api";

Dota.GlobalData = Ember.Object.extend({
});
Dota.GlobalObj = Dota.GlobalData.create();

Dota.Profile = CrudAdapter.createModelWrapper({
  profile_id  : attr(),
  pwd         : attr(),
  displayName : attr(),
  familyName  : attr("string", {defaultValue : ""}),
  givenName   : attr("string", {defaultValue : ""}),
  middleName  : attr("string", {defaultValue : ""}),
  email       : attr(),
}, {
  keys : ['profile_id'],
  apiName : 'profile',
  customApiMap : {
    find : "/user",
    create : "/signup",
  },
  queryParams : ['profile_id'],
  findParams : [],
  serializeFunction : function(record, json) {
    json.displayName = json.givenName + 
                       (json.middleName ? " " + json.middleName : "") +
                       (json.familyName ? " " + json.familyName : "");
  },
});


});

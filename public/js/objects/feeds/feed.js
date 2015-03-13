define([
  "ember",
  "../../app",
  "ember-utils-core",
], function(Ember, Dota, Utils) {

Dota.FeedObject = Ember.Object.extend({
  viewType : "",
  type     : "",
});

return {
  feed : Dota.FeedObject,
};

});

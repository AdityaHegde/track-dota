define([
  "ember",
  "ember-utils",
], function(Ember) {

var Dota = AppWrapper.AppWrapper.create({
  rootElement : "#track-dota",
});

Dota.Router.map(function() {
  this.resource('index', { path : '' }, function() {
    this.resource('game', { path : 'game' }, function() {
    });
    this.resource('login',  { path : 'login'});
    this.resource('signup', { path : 'signup'});
    this.resource('chat', { path : 'chat'});
  });
});

Ember.Handlebars.registerBoundHelper('create-view', function(viewName, options) {
  return Ember.Handlebars.ViewHelper.helper(options.contexts[options.contexts.length - 1], viewName, options);
});

Ember.Handlebars.registerBoundHelper('get-name-by-id', function(id, array) {
  var record = array.findBy("id", id);
  return (record && record.get("name")) || "";
});

return Dota;

});

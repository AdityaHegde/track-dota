Dota = Ember.Application.create({
  rootElement : "#track-dota",
});

var
attr = DS.attr;

Dota.Router.map(function() {
  this.resource('index', { path : '' }, function() {
    this.resource('game', { path : 'game' }, function() {
    });
  });
});

Ember.TextField.reopen({
  attributeBindings: ['autofocus']
});

Ember.Handlebars.registerBoundHelper('create-view', function(viewName, options) {
  return Ember.Handlebars.ViewHelper.helper(options.contexts[options.contexts.length - 1], viewName, options);
});

Ember.Handlebars.registerBoundHelper('get-name-by-id', function(id, array) {
  var record = array.findBy("id", id);
  return (record && record.get("name")) || "";
});

Dota.ApplicationAdapter = CrudAdapter.ApplicationAdapter;
Dota.ApplicationSerializer = CrudAdapter.ApplicationSerializer;

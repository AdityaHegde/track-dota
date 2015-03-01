define([
  "ember",
  "../app",
], function(Ember, Dota) {

Dota.TeamBannerView = Ember.View.extend({
  template : Ember.Handlebars.compile('' +
    '<div {{action "teamSelected" view.type}}>{{view.team.team_tag}}</div>' +
  ''),
  team : null,
  type : 0,

  classNames : ["team-banner"],
});

});

define([
  "ember",
  "../app",
], function(Ember, Dota) {

Dota.HeroHeaderView = Ember.View.extend({
  template : Ember.Handlebars.compile('' +
    '{{#each view.teamSnapshot.players}}' +
      '<div class="hero">' +
        '<img class="hero-icon" width="100%" {{bind-attr src="heroObj.hero_icon"}} {{action "playerSelected" this}}>' +
      '</div>' +
    '{{/each}}' +
  ''),
  teamSnapshot : null,

  classNames : ["hero-header"],
});

});

define([
  "ember",
  "../../app",
], function(Ember, Dota) {

Dota.TeamFightView = Ember.View.extend({
  template : Ember.Handlebars.compile('' +
    '<div>' +
      '{{#each view.feed.data.death}}' +
        '<div>' +
          '<img height="32" {{bind-attr src="playerObj.heroObj.hero_icon"}} /> was killed {{#if isOneAmt}}{{amt}} times!{{/if}}' +
        '</div>' +
      '{{/each}}' +
      '{{#each view.feed.data.kills}}' +
        '<div>' +
          '<img height="32" {{bind-attr src="playerObj.heroObj.hero_icon"}} /> got {{#if isOneAmt}} a kill{{else}} {{amt}} kills}}{{/if}}' +
        '</div>' +
      '{{/each}}' +
    '</div>' +
    '<div>' +
      '<div>{{view.feed.data.radiant.netWorthDiff}} : {{view.feed.data.dire.netWorthDiff}}</div>' +
      '<div>{{view.feed.data.radiant.goldDiff}} : {{view.feed.data.dire.goldDiff}}</div>' +
    '</div>' +
  ''),
  feed : null,
});

});

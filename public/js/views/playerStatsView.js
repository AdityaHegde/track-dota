define([
  "ember",
  "../app",
], function(Ember, Dota) {

Dota.PlayerStatsView = Ember.View.extend({
  layout : Ember.Handlebars.compile('' +
    '{{view "select" value=controller.statView content=controller.statViews optionValuePath="content.viewName" optionLabelPath="content.viewLabel"}}' +
    '{{#each controller.arrangedContent}}' +
      '<div class="player-stat">' +
        '<img class="player-hero col-md-5" {{bind-attr src="heroObj.hero_icon"}} {{action "playerSelected" this}}/><div class="col-md-7">{{view controller.statView player=this}}</div>' +
        '<div class="clearfix"></div>' +
      '</div>' +
    '{{/each}}' +
  ''),

  classNames : ["player-stats"],
});

});

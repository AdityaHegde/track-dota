define([
  "ember",
], function(Ember) {

Ember.TEMPLATES["ability"] = Ember.Handlebars.compile("<div class=\"ability\">\n  <img class=\"hero-img\" {{bind-attr src=model.ability.imgLarge}} {{action \"cast\"}}>\n  {{#if model.cooling}}<div class=\"ability-cast\"></div><div class=\"abilty-cooldown center-block\">{{model.timeLeft}}</div>{{/if}}\n  <div class=\"levels\">\n    <div {{bind-attr class=\":level model.isLevel1:level-taken\"}} {{action \"takeLevel\" 1}}></div>\n    <div {{bind-attr class=\":level model.isLevel2:level-taken\"}} {{action \"takeLevel\" 2}}></div>\n    <div {{bind-attr class=\":level model.isLevel3:level-taken\"}} {{action \"takeLevel\" 3}}></div>\n    {{#unless model.ability.isUlti}}<div {{bind-attr class=\":level model.isLevel4:level-taken\"}} {{action \"takeLevel\" 4}}></div>{{/unless}}\n  </div>\n</div>\n");

Ember.TEMPLATES["chat"] = Ember.Handlebars.compile("{{view \"listGroup/listGroup\" list=model columnDataGroup=columnDataGroup}}\n<div class=\"well\">\n  {{input value=chatText}}\n  <button class=\"btn btn-primary\" {{action \"sendChat\"}}>Send</button>\n</div>\n");

Ember.TEMPLATES["game"] = Ember.Handlebars.compile("<div class=\"well\">\n  {{#each currentMatches}}<span class=\"btn btn-link\" {{action \"fetchGameData\" this}}>{{this}}</span>{{/each}}\n</div>\n{{#if hasGameData}}\n  {{view \"gameHeader\" gameSnapshot=curGameData}}\n  {{view \"gameBody\"   gameSnapshot=curGameData}}\n  {{view \"gameFooter\" gameSnapshot=curGameData}}\n{{/if}}\n");

Ember.TEMPLATES["hero"] = Ember.Handlebars.compile("<div class=\"hero center-block\">\n  <img class=\"hero-img\" {{bind-attr src=model.hero.img}}>\n  <div class=\"abilities\">\n    {{#each model.abilityInstances}}\n      {{render \"ability\" this}}\n    {{/each}}\n  </div>\n</div>\n");

Ember.TEMPLATES["index"] = Ember.Handlebars.compile("<nav class=\"navbar navbar-default\" role=\"navigation\">\n  <div class=\"navbar-header\">\n    <button type=\"button\" class=\"navbar-toggle\" data-toggle=\"collapse\" data-target=\"#navbar-items\">\n      <span class=\"sr-only\">Toggle navigation</span>\n      <span class=\"icon-bar\"></span>\n      <span class=\"icon-bar\"></span>\n      <span class=\"icon-bar\"></span>\n    </button>\n    <a class=\"navbar-brand\" href=\"#\">Track Dota</a>\n  </div>\n  <div class=\"collapse navbar-collapse\" id=\"navbar-items\">\n    <ul class=\"nav navbar-nav\">\n      <li id=\"people-link\">{{#link-to 'index'}}Home{{/link-to}}</li>\n      <li id=\"people-link\">{{#link-to 'game'}}Game{{/link-to}}</li>\n    </ul>\n    {{#if model.profile}}\n      <p class=\"navbar-text navbar-right\">Signed in as {{model.profile.displayName}}, <a href=\"/logout\">Logout</a></p>\n    {{else}}\n      <p class=\"navbar-text navbar-right\">{{#link-to 'login'}}Login{{/link-to}}</p>\n    {{/if}}\n  </div>\n</nav>\n<div class=\"container\">\n  {{outlet}}\n</div>\n");

Ember.TEMPLATES["login"] = Ember.Handlebars.compile("{{view \"form/form\" record=model columnDataGroup=columnDataGroup}}\n<div class=\"btn-toolbar\">\n  <button class=\"btn btn-primary\" {{action \"login\"}}>Login</button>\n  <a class=\"btn btn-default\" href=\"/auth/google\">Google Login</a>\n  {{#link-to \"signup\" class=\":btn :btn-default\"}}Signup{{/link-to}}\n</div>\n");

Ember.TEMPLATES["player"] = Ember.Handlebars.compile("<div class=\"player\">\n  <div class=\"well player-inner\">\n    <h4>{{model.name}}\n    {{view \"select\" content=CrudAdapter.GlobalData.heros optionValuePath=\"content.id\" optionLabelPath=\"content.name\" prompt=\"Select\" value=selectedHero}}\n    </h4>\n    {{render \"hero\" model.heroInstance}}\n  </div>\n</div>\n");

Ember.TEMPLATES["signup"] = Ember.Handlebars.compile("{{view \"form/form\" record=model columnDataGroup=columnDataGroup}}\n<div class=\"btn-toolbar\">\n  <button class=\"btn btn-primary\" {{action \"signup\"}}>Signup</button>\n  <a class=\"btn btn-default\" href=\"/auth/google\">Google Login</a>\n  {{#link-to \"login\" class=\":btn :btn-default\"}}Login{{/link-to}}\n</div>\n");
});

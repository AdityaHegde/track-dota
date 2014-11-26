Ember.TEMPLATES["ability"] = Ember.Handlebars.compile("<div class=\"ability\">\n  <img class=\"hero-img\" {{bind-attr src=model.ability.imgLarge}} {{action \"cast\"}}>\n  {{#if model.cooling}}<div class=\"ability-cast\"></div><div class=\"abilty-cooldown center-block\">{{model.timeLeft}}</div>{{/if}}\n  <div class=\"levels\">\n    <div {{bind-attr class=\":level model.isLevel1:level-taken\"}} {{action \"takeLevel\" 1}}></div>\n    <div {{bind-attr class=\":level model.isLevel2:level-taken\"}} {{action \"takeLevel\" 2}}></div>\n    <div {{bind-attr class=\":level model.isLevel3:level-taken\"}} {{action \"takeLevel\" 3}}></div>\n    {{#unless model.ability.isUlti}}<div {{bind-attr class=\":level model.isLevel4:level-taken\"}} {{action \"takeLevel\" 4}}></div>{{/unless}}\n  </div>\n</div>\n");

Ember.TEMPLATES["game"] = Ember.Handlebars.compile("<div class=\"lineone center-block clearfix\">\n  {{#each lineone}}\n    <div class=\"col-md-4\">\n      {{render \"player\" this}}\n    </div>\n  {{/each}}\n</div>\n<div class=\"linetwo center-block clearfix\">\n  {{#each linetwo}}\n    <div class=\"col-md-6\">\n      {{render \"player\" this}}\n    </div>\n  {{/each}}\n</div>\n");

Ember.TEMPLATES["hero"] = Ember.Handlebars.compile("<div class=\"hero center-block\">\n  <img class=\"hero-img\" {{bind-attr src=model.hero.img}}>\n  <div class=\"abilities\">\n    {{#each model.abilityInstances}}\n      {{render \"ability\" this}}\n    {{/each}}\n  </div>\n</div>\n");

Ember.TEMPLATES["index"] = Ember.Handlebars.compile("<nav class=\"navbar navbar-default\" role=\"navigation\">\n  <div class=\"navbar-header\">\n    <button type=\"button\" class=\"navbar-toggle\" data-toggle=\"collapse\" data-target=\"#navbar-items\">\n      <span class=\"sr-only\">Toggle navigation</span>\n      <span class=\"icon-bar\"></span>\n      <span class=\"icon-bar\"></span>\n      <span class=\"icon-bar\"></span>\n    </button>\n    <a class=\"navbar-brand\" href=\"#\">Track Dota</a>\n  </div>\n  <div class=\"collapse navbar-collapse\" id=\"navbar-items\">\n    <ul class=\"nav navbar-nav\">\n      <li id=\"people-link\">{{#link-to 'index'}}Home{{/link-to}}</li>\n      <li id=\"people-link\">{{#link-to 'game'}}Game{{/link-to}}</li>\n    </ul>\n    <p class=\"navbar-text navbar-right\">Signed in as {{model.userName}}</p>\n  </div>\n</nav>\n<div class=\"container\">\n  {{outlet}}\n</div>\n");

Ember.TEMPLATES["player"] = Ember.Handlebars.compile("<div class=\"player\">\n  <div class=\"well player-inner\">\n    <h4>{{model.name}}\n    {{view \"select\" content=CrudAdapter.GlobalData.heros optionValuePath=\"content.id\" optionLabelPath=\"content.name\" prompt=\"Select\" value=selectedHero}}\n    </h4>\n    {{render \"hero\" model.heroInstance}}\n  </div>\n</div>\n");
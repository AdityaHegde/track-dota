Dota.GlobalData = Ember.Object.extend({
});
Dota.GlobalObj = Dota.GlobalData.create();

var attr = DS.attr, hasMany = DS.hasMany, belongsTo = DS.belongsTo;

Dota.Hero = ModelWrapper.createModelWrapper({
  name : attr(),
  img : attr(),

  abilities : hasMany('ability', {async : true}),
}, {
  keys : ['name'],
  apiName : 'hero',
  queryParams : ['name'],
  findParams : [],
});

Dota.Ability = ModelWrapper.createModelWrapper({
  name : attr(),
  img : attr(),
  cooldowns : hasMany('cooldown', {async : true}),
  hasCooldown : function() {
    return this.get("cooldowns.length") > 0;
  }.property('cooldowns.@each'),
  isUlti : attr('boolean', {defaultValue : false}),
  isPassive : attr('boolean', {defaultValue : false}),
  levels : attr(),
  desc : attr(),

  hero : belongsTo('hero', {async : true}),
}, {
  keys : ['name'],
  apiName : 'ability',
  queryParams : ['name'],
  findParams : [],
  normalizeFunction : function(hash) {
  },

  preSerializeRelations : function(hash) {
    hash.levels = 4 - (hash.isUlti ? 1 : 0);
    if(hash.cooldowns) {
      if(Ember.typeOf(hash.cooldowns) === 'number' || Ember.typeOf(hash.cooldowns) === 'string') {
        var cooldowns = [];
        for(var i = 0; i < hash.levels; i++) {
          cooldowns.push(hash.cooldowns);
        }
        hash.cooldowns = cooldowns;
      }
      for(var i = 0; i < hash.cooldowns.length; i++) {
        if(Ember.typeOf(hash.cooldowns[i]) === 'number' || Ember.typeOf(hash.cooldowns[i]) === 'string') {
          hash.cooldowns[i] = {
            cooldown : Number(hash.cooldowns[i]),
            level : i+1,
          };
        }
      }
    }
  },
});

Dota.Cooldown = ModelWrapper.createModelWrapper({
  cooldown : attr('integer', {defaultValue : -1}),
  level : attr(),
  ability : belongsTo('ability', {async : true}),
}, {
  keys : ['ability', 'level'],
  apiName : 'cooldown',
  queryParams : ['ability', 'level'],
  findParams : [],
});

Dota.Game = ModelWrapper.createModelWrapper({
  game_id : attr(),
  arrayProps : ['players'],
  players : hasMany('player', {async : true}),
}, {
  keys : ['game_id'],
  apiName : 'game',
  queryParams : ['game_id'],
  findParams : [],
}, [
  Utils.DelayedAddToHasMany
]);

Dota.Player = ModelWrapper.createModelWrapper({
  name : attr(),
  game : belongsTo('game', {async : true}),
  heroInstance : belongsTo('hero-instance', {async : true}),
}, {
  keys : ['name'],
  apiName : 'player',
  queryParams : ['name'],
  findParams : [],
});

Dota.HeroInstance = ModelWrapper.createModelWrapper({
  name : attr(),

  hero : belongsTo('hero', {async : true}),
  player : belongsTo('player', {async : true}),
  abilityInstances : hasMany('ability-instance', {async : true}),

  arrayProps : ['abilityInstances'],
}, {
  keys : ['name'],
  apiName : 'heroinstance',
  queryParams : ['name'],
  findParams : [],
}, [
  Utils.DelayedAddToHasMany
]);

Dota.AbilityInstance = ModelWrapper.createModelWrapper({
  name : attr(),
  level : attr(),
  cooldown : attr(),
  cooling : false,
  timeLeft : 0,

  ability : belongsTo('ability', {async : true}),
  heroInstance : belongsTo('hero-instance', {async : true}),

  levelDidChange : function() {
    var level = this.get("level"), levels = this.get("ability.levels"),
        cooldowns = this.get("ability.cooldowns"),
        cooldown = cooldowns && cooldowns.objectAt(level - 1);
    this.set("cooldown", Ember.isNone(cooldown) ? 0 : cooldown.get("cooldown"));
    for(var i = 1; i <= levels; i++) {
      this.set("isLevel"+i, level > 0 && level >= i);
    }
  }.observes("level", "ability.cooldowns.isFulfilled"),

  isLevel1 : false,
  isLevel2 : false,
  isLevel3 : false,
  isLevel4 : false,
}, {
  keys : ['name'],
  apiName : 'abilityinstance',
  queryParams : ['name'],
  findParams : [],
});

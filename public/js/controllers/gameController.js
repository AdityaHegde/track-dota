define([
  "ember",
  "../app",
], function(Ember, Dota) {

Dota.GameController = Ember.Controller.extend({
  lineone : function() {
    var players = this.get("model.players"), lineone = [];
    if(players.get("length") >= 3) {
      lineone.pushObject(players.objectAt(0));
      lineone.pushObject(players.objectAt(1));
      lineone.pushObject(players.objectAt(2));
    }
    return lineone;
  }.property("model.players.@each"),
  linetwo : function() {
    var players = this.get("model.players"), linetwo = [];
    if(players.get("length") >= 5) {
      linetwo.pushObject(players.objectAt(3));
      linetwo.pushObject(players.objectAt(4));
    }
    return linetwo;
  }.property("model.players.@each"),
});

});

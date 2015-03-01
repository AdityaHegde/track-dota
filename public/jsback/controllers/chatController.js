define([
  "ember",
  "../app",
  "ember-utils",
], function(Ember, Dota) {

Dota.ChatController = BaseController.BaseController.extend({
  init : function() {
    this._super();
    var socket = io.connect("/"), that = this;
    socket.on("message", function(data) {
      that.handleMessage(data);
    });
    this.set("socket", socket);
  },

  columnDataGroupName : "chat",

  chatText : "",
  socket : null,

  actions : {
    sendChat : function() {
      var socket = this.get("socket");
      socket.emit("send", {
        message : this.get("chatText"),
        profile_id : CrudAdapter.GlobalData.get("heros.profile.profile_id"),
      });
    },
  },

  handleMessage : function(data) {
    var model = this.get("model");
    model.pushObject(Ember.Object.create(data));
  },
});

});

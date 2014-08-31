Popovers = Ember.Namespace.create();

Popovers.PopoverComponent = Ember.Component.extend({
  attributeBindings : ['animation:data-animation', 'placement:data-placement', 'title:data-original-title', 'body:data-content', 'delay:data-delay', 'role'],
  animation : "true",
  placement : "top",
  title : "",
  body : "",
  delay : 0,
  role : "button",
  layout : Ember.Handlebars.compile('{{yield}}'),
  data : null,

  didInsertElement : function() {
    $(this.get("element")).popover();
  },
});

Ember.Handlebars.helper('pop-over', Popovers.PopoverComponent);

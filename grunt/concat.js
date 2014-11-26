module.exports = {
  dist : {
    files : {
      "dist/ember-utils.js" : ["build/ember-utils.js"],
      "dist/demo.js" : ["build/demo/demo.js"],
    },
  },
  css : {
    files : {
      "dist/ember-utils.css" : ["src/css/ember-utils.css"],
    },
  },
  templates : {
    files : {
      "public/js/templates.js" : ["public/templates/templates.start.js", "public/templates/templates.js", "public/templates/templates.end.js"],
    },
  },
};

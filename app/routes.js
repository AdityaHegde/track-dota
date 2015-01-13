var
dataHandler = require("./lib/data_handler"),
express = require("express"),
utils = require("./lib/utils");

module.exports = function(app, passport) {

  app.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] }));
  app.get('/auth/google/callback',
    passport.authenticate('google', { 
      successRedirect: '/',
      failureRedirect: '/'
    })
  );

  app.post('/signup', passport.authenticate('local-signup'), function(req, res) {
    console.log("Signup");
    res.send(utils.retResult(req.user));
  });

  app.post('/login', passport.authenticate('local-login'), function(req, res) {
    console.log("Login");
    res.send(utils.retResult(req.user));
  });

  app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });

  function ensureAuthentication(req, res, next) {
    res.set("Content-Type", "application/json");
    //if (req.isAuthenticated()) { return next(); }
    //res.send(utils.retError("Forbidden"));
    return next();
  }

  app.get(/^\/data\/v1\/api\/.*$/, ensureAuthentication, dataHandler.get);
  app.post(/^\/data\/v1\/api\/.*$/, ensureAuthentication, dataHandler.create);
  app.put(/^\/data\/v1\/api\/.*$/, ensureAuthentication, dataHandler.update);
  app.delete(/^\/data\/v1\/api\/.*$/, ensureAuthentication, dataHandler.delete);

  app.use("/", express.static('./public'));

};

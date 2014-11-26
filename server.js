var 
express = require("express"),
bodyParser = require("body-parser"),
cookieParser = require("cookie-parser"),
session = require("express-session"),
methodOverride = require('method-override'),
dataHandler = require("./lib/data_handler"),
mongodb_data_adaptor = require("./lib/mongodb_data_adaptor"),
authentication = require("./authentication"),
passport = require("passport"),
utils = require("./lib/utils"),
app = express();

mongodb_data_adaptor.init({
  profile : require("./lib/models/profile"),
  heros   : require("./lib/models/hero"),
});

app.use(bodyParser.json());
app.use(cookieParser());
app.use(methodOverride());
app.use(session({ secret : "Dota2!" }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/google', passport.authenticate('google'));
app.get('/auth/google/return',
  passport.authenticate('google', { 
    successRedirect: '/',
    failureRedirect: '/login'
  })
);
app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

function ensureAuthentication(req, res, next) {
  //disable this for now
  /*res.set("Content-Type", "application/json");
  if (req.isAuthenticated()) { return next(); }
  res.send(utils.retError("Forbidden"));*/
  return next();
}

app.get(/^\/data\/v1\/api\/.*$/, ensureAuthentication, dataHandler.get);
app.post(/^\/data\/v1\/api\/.*$/, ensureAuthentication, dataHandler.create);
app.put(/^\/data\/v1\/api\/.*$/, ensureAuthentication, dataHandler.update);
app.delete(/^\/data\/v1\/api\/.*$/, ensureAuthentication, dataHandler.delete);

app.use("/", express.static('./public'));

app.listen(parseInt(process.env.OPENSHIFT_NODEJS_PORT) || 8080, process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");

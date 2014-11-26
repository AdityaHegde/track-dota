var 
mongodb_data_adaptor = require("./lib/mongodb_data_adaptor"),
passport = require("passport"),
GoogleStrategy = require("passport-google").Strategy,
ObjectId = require('mongoose').Types.ObjectId;

module.exports = passport.use(
  new GoogleStrategy({
    returnURL: 'http://localhost:8080/auth/google/return',
    realm: 'http://localhost:8080/'
  },
  function(identifier, profile, done) {
    console.log("In strategy");
    profile.oauthId = identifier;
    mongodb_data_adaptor.get("profile", profile, function(err, user) {
      done(err, user);
    }, 1);
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.oauthId);
});

passport.deserializeUser(function(id, done) {
  mongodb_data_adaptor.get("profile", {oauthId : id}, function(err, user) {
    done(err, user);
  });
});

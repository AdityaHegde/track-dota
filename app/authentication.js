var 
mongodb_data_adaptor = require("./lib/mongodb_data_adaptor"),
passport             = require("passport"),
GoogleStrategy       = require('passport-google-oauth').OAuth2Strategy
LocalStrategy        = require('passport-local').Strategy,
utils                = require("./lib/utils"),
configAuth           = require('./config/auth');

passport.use(
  new GoogleStrategy({
    clientID        : configAuth.googleAuth.clientID,
    clientSecret    : configAuth.googleAuth.clientSecret,
    callbackURL     : configAuth.googleAuth.callbackURL,
  }, function(token, refreshToken, profile, done) {
    console.log("In strategy");
    var profileObj = {
      profile_id  : profile.id,
      token       : token,
      displayName : profile.displayName,
      email       : profile.emails[0].value,
      name        : profile.name,
    };
    mongodb_data_adaptor.get("profile", profileObj, function(err, user) {
      if(err) {
        done(err);
      }
      else {
        done(null, user);
      }
    }, 1);
  })
);

passport.use("local-signup",
  new LocalStrategy({
    usernameField : "profile_id",
    passwordField : "pwd",
    passReqToCallback : true,
  }, function(req, profile_id, pwd, done) {
    var profile = {
      profile_id  : profile_id,
      pwd         : utils.generateHash(pwd),
      displayName : req.body.displayName,
      email       : req.body.email,
      name        : {
        familyName  : req.body.familyName,
        givenName   : req.body.givenName,
        middleName  : req.body.middleName,
      },
    };
    mongodb_data_adaptor.get("profile", profile, function(err, user) {
      if(err) {
        done(err);
      }
      else if(user) {
        done(null, null, "User is already in use");
      }
      else {
        mongodb_data_adaptor.create("profile", profile, function(err, user) {
          if(err) {
            done(err);
          }
          else {
            done(null, user);
          }
        }, 1);
      }
    });
  })
);

passport.use('local-login',
  new LocalStrategy({
    usernameField : "profile_id",
    passwordField : "pwd",
    passReqToCallback : true,
  }, function(req, profile_id, pwd, done) {
    mongodb_data_adaptor.get("profile", { profile_id : profile_id }, function(err, user) {
      if(err) {
        done(err);
      }
      else if(!user) {
        console.log("User not found");
        done(err, false, "User not found");
      }
      else if(!utils.validPassword(pwd, user.pwd)) {
        console.log("Wrong password");
        return done(null, false, "Wrong password.");
      }
      done(null, user);
    });
  })
);

passport.serializeUser(function(user, done) {
  done(null, user.profile_id);
});

passport.deserializeUser(function(profile_id, done) {
  mongodb_data_adaptor.get("profile", {profile_id : profile_id}, function(err, user) {
    delete user._id;
    delete user.__v;
    done(err, user);
  });
});

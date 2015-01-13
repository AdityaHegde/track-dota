var 
mongoose = require("mongoose"),
profileSchema = mongoose.Schema({
  profile_id  : String,
  pwd         : String,
  displayName : String,
  email       : String,
  name        : {
    familyName  : String,
    givenName   : String,
    middleName  : String,
  },
}),
profile = mongoose.model('Profile', profileSchema);

profile.searchAttr = "profile_id";
profile.queryParam = "profile_id";

module.exports = profile;

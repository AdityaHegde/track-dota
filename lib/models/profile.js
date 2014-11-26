var 
mongoose = require("mongoose"),
emailSchema = mongoose.Schema({
  value : String,
  type  : String,
}),
photoSchema = mongoose.Schema({
  value : String,
}),
profileSchema = mongoose.Schema({
  oauthId     : String,
  displayName : String,
  name        : {
    familyName : String,
    givenName  : String,
    middleName : String,
  },
  emails      : [emailSchema],
  photos      : [photoSchema],
}),
profile = mongoose.model('Profile', profileSchema);

profile.searchAttr = "oauthId";
profile.queryParam = "oauthId";

module.exports = profile;

var config = require("./config");

module.exports = {

  'facebookAuth' : {
    'clientID'      : 'your-secret-clientID-here', // your App ID
    'clientSecret'  : 'your-client-secret-here', // your App Secret
    'callbackURL'   : 'http://localhost:8080/auth/facebook/callback'
  },

  'twitterAuth' : {
    'consumerKey'       : 'your-consumer-key-here',
    'consumerSecret'    : 'your-client-secret-here',
    'callbackURL'       : 'http://localhost:8080/auth/twitter/callback'
  },

  'googleAuth' : {
    'clientID'      : '450453923919-sd03id9lmon9rrao7il4r1qt68rq8kt6.apps.googleusercontent.com',
    'clientSecret'  : '123Eak7KbGL3uJpnnKv-75kA',
    'callbackURL'   : 'http://localhost:8080/auth/google/callback'
  }

};

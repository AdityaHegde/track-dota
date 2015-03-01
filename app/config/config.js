module.exports = {
  server : {
    host : "localhost",
    port : parseInt(process.env.OPENSHIFT_NODEJS_PORT) || 8080,
    ip   : process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1",
  },
  dota2 : {
    apiKey : "A8AE3F6AEA4E4082DB4111651D0E9AE3",
  },
  mongodb : {
    mongodb : process.env.OPENSHIFT_MONGODB_DB_URL || "mongodb://localhost/local",
  },
};

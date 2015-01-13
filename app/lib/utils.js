var bcrypt   = require('bcrypt-nodejs');

exports.retStatus = function(status) {
  return JSON.stringify({
    result : {
      status : status,
    },
  });
};

exports.retResult = function(result, meta) {
  meta = meta || {};
  meta.status = 0;
  meta.message = "Success";
  meta.data = result;
  return JSON.stringify({
    result : meta,
  });
};

exports.retError = function(errorStr) {
  return JSON.stringify({
    result : {
      status : 1,
      message : errorStr,
    },
  });
};

exports.generateHash = function(pwd) {
  return bcrypt.hashSync(pwd, bcrypt.genSaltSync(8), null);
};

exports.validPassword = function(pwd, dbPwd) {
  return bcrypt.compareSync(pwd, dbPwd);
};

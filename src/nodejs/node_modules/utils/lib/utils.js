exports.retStatus = function(status) {
  return JSON.stringify({
    result : {
      status : status,
    },
  });
};

exports.retResult = function(result) {
  return JSON.stringify({
    result : {
      status : 0,
      message : "Success",
      data : result,
    },
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

const MESSAGE = {
  SUCCESS: '请求成功',   // 0
  PARAMETER_ERROR: '参数错误',   // 1000
  USER_NOT_EXIST: '用户不存在',   // 1001
  PASSWORD_ERROR: '账号密码错误',  // 1002
  CODE_ERROR: '验证码错误', // 1003
  USER_ALREADY_EXIST: '用户已被注册', // 1004
  USER_ALREADY_CONNECT: '用户已被匹配', // 1005
  ADMIN_ERROR: '用户无管理员权限', // 3000
  USER_NOT_LOGIN: '用户尚未登录', // 4000
  REQUEST_ERROR: '请求时间间隔过短', // 5000
}

const KEY = 'airing';
const SQL_PASSWORD = '';
const YUNPIAN_APIKEY = 'd1854b3aa962e88c4880bbcd10014877';
const QINIU_ACCESS = 'diCBIWtSI2mabzsq7hQT8oiSg8RkjOeSk4HxSa-5';
const QINIU_SECRET = 'xc6Oko9Jc4MMKffMPKXSwJIaQxA0z6l-y_Odmm15';
const BUCKET = 'airingursb';
const ADMIN_USER = 'airing';
const ADMIN_PASSWORD = '1123581321';

function getNowFormatDate() {
  var date = new Date();
  var seperator1 = "-";
  var seperator2 = ":";
  var month = date.getMonth() + 1;
  var strDate = date.getDate();
  var strHours = date.getHours();
  var strMinutes = date.getMinutes();
  var strSeconds = date.getSeconds();
  if (month >= 1 && month <= 9) {
    month = "0" + month;
  }
  if (strDate >= 0 && strDate <= 9) {
    strDate = "0" + strDate;
  }
  if (strHours >= 0 && strHours <= 9) {
    strHours = "0" + strHours;
  }
  if (strMinutes >= 0 && strMinutes <= 9) {
    strMinutes = "0" + strMinutes;
  }
  if (strSeconds >= 0 && strSeconds <= 9) {
    strSeconds = "0" + strSeconds;
  }
  var currentDate = date.getFullYear() + seperator1 + month + seperator1 + strDate
    + 'T' + strHours + seperator2 + strMinutes
    + seperator2 + strSeconds + '.000Z';
  return currentDate;
}

const log = function (api) {
  console.log('POST: ' + api);
  console.log('TIME: ' + getNowFormatDate());
}

exports.MESSAGE = MESSAGE;
exports.KEY = KEY;
exports.SQL_PASSWORD = SQL_PASSWORD;
exports.YUNPIAN_APIKEY = YUNPIAN_APIKEY;
exports.QINIU_ACCESS = QINIU_ACCESS;
exports.QINIU_SECRET = QINIU_SECRET;
exports.ADMIN_USER = ADMIN_USER;
exports.ADMIN_PASSWORD = ADMIN_PASSWORD;
exports.BUCKET = BUCKET;
exports.log = log;

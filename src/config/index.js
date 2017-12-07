export const MESSAGE = {
  SUCCESS: '请求成功', // 0
  PARAMETER_ERROR: '参数错误', // 1000
  USER_NOT_EXIST: '用户不存在', // 1001
  PASSWORD_ERROR: '账号密码错误', // 1002
  CODE_ERROR: '验证码错误', // 1003
  USER_ALREADY_EXIST: '用户已被注册', // 1004
  USER_ALREADY_CONNECT: '用户已被匹配', // 1005
  ADMIN_ERROR: '用户无管理员权限', // 3000
  USER_NOT_LOGIN: '用户尚未登录', // 4000
  REQUEST_ERROR: '请求时间间隔过短', // 5000
}

export const KEY = 'airing'
export const SQL_USER = 'root'
export const SQL_PASSWORD = ''
export const YUNPIAN_APIKEY = '' // 云片APIKEY
export const QINIU_ACCESS = '' // 七牛ACCESS
export const QINIU_SECRET = '' // 七牛SECRET
export const BUCKET = '' // 七牛BUCKET
export const ADMIN_USER = 'airing'
export const ADMIN_PASSWORD = '1123581321'

export const getNowFormatDate = () => {
  const date = new Date()
  const seperator1 = '-'
  const seperator2 = ':'
  let month = date.getMonth() + 1
  let strDate = date.getDate()
  let strHours = date.getHours()
  let strMinutes = date.getMinutes()
  let strSeconds = date.getSeconds()
  if (month >= 1 && month <= 9) {
    month = '0' + month
  }
  if (strDate >= 0 && strDate <= 9) {
    strDate = '0' + strDate
  }
  if (strHours >= 0 && strHours <= 9) {
    strHours = '0' + strHours
  }
  if (strMinutes >= 0 && strMinutes <= 9) {
    strMinutes = '0' + strMinutes
  }
  if (strSeconds >= 0 && strSeconds <= 9) {
    strSeconds = '0' + strSeconds
  }
  return date.getFullYear() + seperator1 + month + seperator1 + strDate
    + 'T' + strHours + seperator2 + strMinutes
    + seperator2 + strSeconds + '.000Z'
}

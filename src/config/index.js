import md5 from 'md5'

export const MESSAGE = {
  SUCCESS: '请求成功', // 0
  TOKEN_ERROR: 'TOKEN错误', // 500
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
export const ADMIN_PASSWORD = ''

export const md5Pwd = (password) => {
  const salt = 'Airing_is_genius_3957x8yza6!@#IUHJh~~'
  return md5(md5(password + salt))
}

export const checkToken = function (uid, timestamp, token) {
  return token === md5(uid.toString() + timestamp.toString() + KEY)
}

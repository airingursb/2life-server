import md5 from 'md5'

export const MESSAGE = {
  OK: {
    code: 0,
    message: '请求成功',
  },
  PASSWORD_ERROR: {
    code: 300,
    message: '密码错误',
  },
  ADMIN_ERROR: {
    code: 301,
    message: '管理员密码错误',
  },
  USER_EXIST: {
    code: 302,
    message: '用户已存在',
  },
  TOKEN_ERROR: {
    code: 403,
    message: 'TOKEN失效',
  },
  USER_NOT_EXIST: {
    code: 404,
    message: '用户不存在',
  },
  CODE_ERROR: {
    code: 405,
    message: '验证码错误',
  },
  PARAMETER_ERROR: {
    code: 422,
    message: '参数错误',
  },
  REQUEST_ERROR: {
    code: 501,
    message: '请求失败',
  },
  QUICK_REQUEST: {
    code: 502,
    message: '请求间隔过短',
  },
  CONNECT_ERROR_CLOSE: {
    code: 600,
    message: '用户已关闭匹配',
  },
  CONNECT_ERROR_ALREADY: {
    code: 601,
    message: '用户已匹配',
  },
  CONNECT_ERROR_BAN: {
    code: 602,
    message: '用户没有匹配权限'
  },
  CONNECT_ERROR_NO_TIME: {
    code: 603,
    message: '用户没有匹配次数'
  },
  CONNECT_ERROR_NO_NOTE: {
    code: 604,
    message: '用户没有写过日记'
  },
  CONNECT_ERROR_BAN_NOW: {
    code: 605,
    message: '用户没有匹配权限'
  },
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

export const validate = (res, check, ...params) => {

  for (let param of params) {
    if (typeof param === 'undefined' || param === null) {
      return res.json(MESSAGE.PARAMETER_ERROR)
    }
  }

  if (check) {
    const uid = params[0]
    const timestamp = params[1]
    const token = params[2]

    if (token !== md5Pwd(uid.toString() + timestamp.toString() + KEY))
      return res.json(MESSAGE.TOKEN_ERROR)
  }
}

import express from 'express'

import { User, Code, Message, Note, Badge, Feedback, Activity } from '../models'

import md5 from 'md5'

import https from 'https'
import querystring from 'querystring'
import rp from 'request-promise'

import {
  MESSAGE,
  KEY,
  YUNPIAN_APIKEY,
  WXP_APPID,
  WXP_SECRET,
  WX_APP_APPID,
  WX_APP_APPSECRET,
  GITHUB_TOKEN,
  validate,
  md5Pwd,
  JiGuangPush,
  IS_CHECKING
} from '../config'

const router = express.Router()

/* users/code */
router.post('/code', (req, res) => {

  const { account } = req.body
  const region = req.body.region || 'china'
  validate(res, false, account)

  const now = Date.now()
  const code = Math.floor(Math.random() * 8999 + 1000)

  const postData = {
    mobile: account,
    text: region === 'china' ? ('【双生日记】您的验证码是' + code) : ('【2Life】Your SMS Verification Code: ' + code),
    apikey: YUNPIAN_APIKEY
  }

  const content = querystring.stringify(postData)
  const options = {
    host: 'sms.yunpian.com',
    path: '/v2/sms/single_send.json',
    method: 'POST',
    agent: false,
    rejectUnauthorized: false,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': content.length
    }
  }

  const model = {
    account,
    code,
    timestamp: now,
    used: false
  }

  const sendMsg = async () => {
    const req = https.request(options, (res) => {
      res.setEncoding('utf8')
    })
    req.write(content)
    req.end()
    return true
  }

  const response = async () => {
    const results = await Code.findAll({ where: { account, used: false } })
    if (results[0] !== undefined) {
      if (now - results[0].timestamp < 600000) {
        return res.json(MESSAGE.REQUEST_ERROR)
      }
    }
    await Code.create(model)
    await sendMsg()
    return res.json({ ...MESSAGE.OK, data: { timestamp: now } })
  }

  response()
})

/* users/register */
router.post('/register', (req, res) => {

  const { account, password, code, timestamp } = req.body
  validate(res, false, account, password, code, timestamp)

  const findCode = async () => {
    return await Code.findOne({ where: { code, timestamp } })
  }

  const response = async () => {
    const code = await findCode()
    if (code) {
      const user = await User.findOne({ where: { account } })
      // TODO: 未知 bug
      // await Code.update({ used: true }, { where: { account, code, timestamp } })
      if (user) {
        return res.json(MESSAGE.USER_EXIST)
      } else {
        const user_code = Date.now().toString().substring(2)
        const userinfo = {
          account,
          password: md5(password),
          sex: 0,
          name: account,
          user_other_id: -1,
          code: user_code,
          status: 502,
          last_times: 3,
          total_times: 0,
          total_notes: 0,
          mode: 0,
          rate: 0,
          badge_id: -1,
          badges: '',
          ban_id: user_code + ',',
          face: 'https://airing.ursb.me/image/twolife/male.png'
        }
        await User.create(userinfo)
        return res.json({ ...MESSAGE.OK, data: userinfo })
      }
    }
    return res.json(MESSAGE.CODE_ERROR)
  }

  response()
})

/* users/login */
router.post('/login', (req, res) => {

  const { account, password } = req.body
  validate(res, false, account, password)

  const response = async () => {
    const user = await User.findOne({ where: { account }, include: [Badge] })
    if (!user) return res.json(MESSAGE.USER_NOT_EXIST)

    if (user.password !== md5(password))
      return res.json(MESSAGE.PASSWORD_ERROR)

    const timestamp = Date.now()

    const token = md5Pwd((user.id).toString() + timestamp.toString() + KEY)

    let partner = {}
    if (user.user_other_id !== -1) {
      partner = await User.findOne({ where: { id: user.user_other_id }, include: [Badge] })
    }

    return res.json({
      ...MESSAGE.OK,
      data: {
        user: { ...user.dataValues, password: 0 },
        key: { uid: user.id, token, timestamp },
        partner: { ...partner.dataValues, password: 0 }
      }
    })
  }

  response()
})

/* users/user */
router.get('/user', (req, res) => {

  const { uid, timestamp, token, user_id } = req.query
  validate(res, true, uid, timestamp, token, user_id)

  const response = async () => {
    const user = await User.findOne({ where: { id: user_id }, include: [Badge] })
    if (!user) return res.json(MESSAGE.USER_NOT_EXIST)
    const partner = await User.findOne({ where: { id: user.user_other_id } })
    if (partner) {
      return res.json({
        ...MESSAGE.OK,
        data: { ...user.dataValues, password: 0 },
        partner: { ...partner.dataValues, password: 0 }
      })
    } else {
      return res.json({
        ...MESSAGE.OK,
        data: { ...user.dataValues, password: 0 },
        partner: {}
      })
    }
  }

  response()
})

/* users/update */
router.post('/update', (req, res) => {

  const { uid, timestamp, token, sex, name, face, status, latitude, longitude, badge_id, badges } = req.body
  validate(res, true, uid, timestamp, token, sex, name, face, status, latitude, longitude, badge_id)

  const response = async () => {

    await User.update({ name, sex, face, status, latitude, longitude, badge_id, badges }, { where: { id: uid } })

    const user = await User.findById(uid)
    if (!user) return res.json(MESSAGE.USER_NOT_EXIST)

    const partner = await User.findOne({ where: { id: user.user_other_id } })

    if (partner) {
      return res.json({
        ...MESSAGE.OK,
        data: {
          user: { ...user.dataValues, password: 0 },
          partner: { ...partner.dataValues, password: 0 }
        }
      })
    } else {
      return res.json({
        ...MESSAGE.OK,
        data: {
          user: { ...user.dataValues, password: 0 },
          partner: {}
        }
      })
    }
  }

  response()
})

/* users/disconnect */
router.get('/disconnect', (req, res) => {

  const { uid, timestamp, token } = req.query
  validate(res, true, uid, timestamp, token)

  const response = async () => {
    const user = await User.findOne({ where: { id: uid } })
    const partner = await User.findOne({ where: { id: user.user_other_id } })

    JiGuangPush(user.user_other_id, '您被另一半解除匹配了:(，多写日记来记录自己的生活吧！')
    await Message.create({
      title: '您被另一半解除匹配了QAQ',
      type: 202,
      content: '',
      image: '',
      url: '',
      date: Date.now(),
      user_id: partner.id
    })
    await partner.increment('unread')

    let user_bans = user.ban_id + partner.code + ','
    let partner_bans = partner.ban_id + user.code + ','

    // 用户状态变为解除后的临界状态
    // 需要用户在匹配页面重新设置状态
    // 否则无法被匹配到
    // await User.update({ status: 0, user_other_id: -1, ban_id: user_bans }, { where: { id: user.user_other_id } })
    // await User.update({ status: 0, user_other_id: -1, ban_id: partner_bans }, { where: { id: uid } })

    // 2.0.5: 弱化匹配规则
    if (partner.sex === 1) {
      await User.update({ status: 113, user_other_id: -1, ban_id: user_bans }, { where: { id: user.user_other_id } })
    } else {
      await User.update({ status: 103, user_other_id: -1, ban_id: user_bans }, { where: { id: user.user_other_id } })
    }

    if (user.sex === 1) {
      await User.update({ status: 113, user_other_id: -1, ban_id: partner_bans }, { where: { id: uid } })
    } else {
      await User.update({ status: 103, user_other_id: -1, ban_id: partner_bans }, { where: { id: uid } })
    }

    // 清空双方的喜欢记录
    await Note.update({ is_liked: 0 }, { where: { user_id: [uid, user.user_other_id] } })

    return res.json(MESSAGE.OK)
  }

  response()
})

/* users/connect_by_random */
router.get('/connect_by_random', (req, res) => {

  const { uid, timestamp, token } = req.query
  validate(res, true, uid, timestamp, token)

  const response = async () => {

    const user = await User.findOne({ where: { id: uid } })

    let condition = {}

    // status 的意义详见数据字典
    switch (user.status) {
      case 999:
        return res.json(MESSAGE.CONNECT_ERROR_CLOSE)
        break
      case 1000:
        return res.json(MESSAGE.CONNECT_ERROR_ALREADY)
        break
      case 101:
        condition = {
          status: { '$or': [111, 112, 113] },
          sex: 1,
          mode: user.mode > 50 ? { 'lte': 50 } : { 'gte': 50 },
          total_notes: { 'gte': 1 }
        }
        break
      case 102:
        condition = {
          status: { '$or': [111, 112, 113] },
          sex: 1,
          mode: user.mode > 50 ? { 'gte': 50 } : { 'lte': 50 },
          total_notes: { 'gte': 1 }
        }
        break
      case 103:
        condition = {
          status: { '$or': [111, 112, 113] },
          sex: 1,
          total_notes: { 'gte': 1 }
        }
        break
      case 111:
        condition = {
          status: { '$or': [101, 102, 103] },
          sex: 0,
          mode: user.mode > 50 ? { 'lte': 50 } : { 'gte': 50 },
          total_notes: { 'gte': 1 }
        }
        break
      case 112:
        condition = {
          status: { '$or': [101, 102, 103] },
          sex: 0,
          mode: user.mode > 50 ? { 'gte': 50 } : { 'lte': 50 },
          total_notes: { 'gte': 1 }
        }
        break
      case 113:
        condition = {
          status: { '$or': [101, 102, 103] },
          sex: 0,
          total_notes: { 'gte': 1 }
        }
        break
      case 201:
        condition = {
          status: { '$or': [201, 202, 203] },
          sex: 0,
          mode: user.mode > 50 ? { 'lte': 50 } : { 'gte': 50 },
          total_notes: { 'gte': 1 }
        }
        break
      case 202:
        condition = {
          status: { '$or': [201, 202, 203] },
          sex: 0,
          mode: user.mode > 50 ? { 'gte': 50 } : { 'lte': 50 },
          total_notes: { 'gte': 1 }
        }
        break
      case 203:
        condition = {
          status: { '$or': [211, 212, 213] },
          sex: 0,
          total_notes: { 'gte': 1 }
        }
        break
      case 211:
        condition = {
          status: { '$or': [211, 212, 213] },
          sex: 1,
          mode: user.mode > 50 ? { 'lte': 50 } : { 'gte': 50 },
          total_notes: { 'gte': 1 }
        }
        break
      case 212:
        condition = {
          status: { '$or': [211, 212, 213] },
          sex: 1,
          mode: user.mode > 50 ? { 'gte': 50 } : { 'lte': 50 },
          total_notes: { 'gte': 1 }
        }
        break
      case 213:
        condition = {
          status: { '$or': [201, 202, 203] },
          sex: 1,
          total_notes: { 'gte': 1 }
        }
        break
      case 501:
        return res.json(MESSAGE.CONNECT_ERROR_NO_TIME)
        break
      case 502:
        return res.json(MESSAGE.CONNECT_ERROR_NO_NOTE)
        break
      default:
        return res.json(MESSAGE.CONNECT_ERROR_BAN)
        break
    }

    const candidates = await User.findAll({
      where: {
        ...condition,
        code: { '$notIn': user.ban_id.split(',') }
      }
    })

    if (!candidates[0]) return res.json(MESSAGE.USER_NOT_EXIST)

    const partner = candidates[Math.floor(Math.random() * candidates.length)]

    if (user.last_times < 1) {
      // await User.update({ status: 501, user_other_id: partner.id, connect_at: Date.now() }, { where: { id: uid } })
      return res.json(MESSAGE.CONNECT_ERROR_NO_TIME)
    } else {
      await User.update({ status: 1000, user_other_id: partner.id, connect_at: Date.now() }, { where: { id: uid } })
    }

    await User.update({ status: 1000, user_other_id: uid, connect_at: Date.now() }, { where: { id: partner.id } })

    /**
     * 匹配逻辑
     * 1. 匹配次数为主动匹配的次数
     * 2. 匹配时暂只减少主动匹配者的次数
     * 3. 匹配次数为零只能被匹配
     */

    await user.decrement('last_times')
    await user.increment('total_times')

    // 通知对方被匹配
    JiGuangPush(partner.id, '您期待的另一半已经来了:)，多写日记来记录自己的生活吧！')
    await Message.create({
      title: `${user.name} 成功匹配到了您，成为您的另一半`,
      type: 201,
      content: '',
      image: '',
      url: '',
      date: Date.now(),
      user_id: partner.id
    })
    await partner.increment('unread')

    return res.json({
      ...MESSAGE.OK,
      data: { ...partner.dataValues, password: 0 }
    })
  }

  response()
})

/* users/connect_by_id */
router.get('/connect_by_id', (req, res) => {

  const { uid, timestamp, token, code } = req.query
  validate(res, true, uid, timestamp, token, code)

  const response = async () => {
    const user = await User.findOne({ where: { id: uid } })
    const partner = await User.findOne({ where: { code } })

    // 不允许匹配自己
    if (user.code === code) {
      return res.json(MESSAGE.USER_NOT_EXIST)
    }
    if (!partner) {
      return res.json(MESSAGE.USER_NOT_EXIST)
    }

    if (user.status === 501)
      return res.json(MESSAGE.CONNECT_ERROR_NO_TIME)
    if (user.status === 502 || partner.status === 502)
      return res.json(MESSAGE.CONNECT_ERROR_NO_NOTE)
    if (user.status === 503 || user.status === 504 || partner.status === 503 || partner.status === 504)
      return res.json(MESSAGE.CONNECT_ERROR_BAN)
    if (user.status === 999 || partner.status === 999)
      return res.json(MESSAGE.CONNECT_ERROR_CLOSE)
    if (user.user_other_id !== -1 || partner.user_other_id !== -1)
      return res.json(MESSAGE.CONNECT_ERROR_ALREADY)

    if (user.last_times < 1) {
      // await User.update({ status: 501, user_other_id: partner.id, connect_at: Date.now() }, { where: { id: uid } })
      return res.json(MESSAGE.CONNECT_ERROR_NO_NOTE)
    } else {
      await User.update({ status: 1000, user_other_id: partner.id, connect_at: Date.now() }, { where: { id: uid } })
    }

    await User.update({ status: 1000, user_other_id: uid, connect_at: Date.now() }, { where: { id: partner.id } })

    await user.decrement('last_times')
    await user.increment('total_times')

    // 通知对方被匹配
    JiGuangPush(partner.id, '您期待的另一半已经来了:)，多写日记来记录自己的生活吧！')
    await Message.create({
      title: `${user.name} 成功匹配到了您，成为您的另一半`,
      type: 201,
      content: '',
      image: '',
      url: '',
      date: Date.now(),
      user_id: partner.id
    })
    await partner.increment('unread')

    return res.json({
      ...MESSAGE.OK,
      data: { ...partner.dataValues, password: 0 }
    })
  }

  response()
})

/* users/show_notification */
router.get('/show_notification', (req, res) => {

  const { uid, timestamp, token } = req.query
  validate(res, true, uid, timestamp, token)

  const response = async () => {
    const data = await Message.findAll({ where: { user_id: [uid, -1] }, order: 'date DESC' })
    await User.update({ unread: 0 }, { where: { id: uid } })
    return res.json({ ...MESSAGE.OK, data })
  }

  response()
})

/* users/invitation_code */
router.get('/invitation_code', (req, res) => {

  const { uid, timestamp, token, code } = req.query
  validate(res, true, uid, timestamp, token, code)

  const response = async () => {
    // TODO: 随机邀请码逻辑
    // const award = await Award.findOne({ where: { code, used: false } })

    if (code === 'airing5201314') {
      const user = await User.findOne({ where: { id: uid } })
      await User.update({ badges: user.badges + '1,', badge_id: 1 }, { where: { id: uid } })
      return res.json(MESSAGE.OK)
    } else {
      return res.json(MESSAGE.CODE_NOT_EXIST)
    }
  }

  response()
})


/* users/update_rate */
router.post('/update_rate', (req, res) => {

  const { uid, timestamp, token, price } = req.body
  validate(res, true, uid, timestamp, token, price)

  const response = async () => {
    const user = await User.findOne({ where: { id: uid } })
    await user.increment('rate', { by: price })
    return res.json(MESSAGE.OK)
  }

  response()
})

/* users/add_last_times */
router.post('/add_last_times', (req, res) => {

  const { uid, timestamp, token } = req.body
  validate(res, true, uid, timestamp, token)

  const response = async () => {
    const user = await User.findOne({ where: { id: uid } })
    await user.increment('rate')
    await user.increment('last_times')
    return res.json(MESSAGE.OK)
  }

  response()
})

/* users/close_connection */
router.get('/close_connection', (req, res) => {

  const { uid, timestamp, token } = req.query
  validate(res, true, uid, timestamp, token)

  const response = async () => {
    await User.update({ status: 999 }, { where: { id: uid } })
    return res.json(MESSAGE.OK)
  }

  response()
})


/* users/oauth_login */
router.post('/oauth_login', (req, res) => {

  const { code, type } = req.body
  validate(res, false, code, type)

  let options = {}

  if (type === 'app') {
    options = {
      uri: 'https://api.weixin.qq.com/sns/oauth2/access_token',
      qs: {
        appid: WX_APP_APPID,
        secret: WX_APP_APPSECRET,
        code,
        grant_type: 'authorization_code'
      },
      json: true
    }
  } else if (type === 'wxp') {
    options = {
      uri: 'https://api.weixin.qq.com/sns/jscode2session',
      qs: {
        appid: WXP_APPID,
        secret: WXP_SECRET,
        js_code: code,
        grant_type: 'authorization_code'
      },
      json: true
    }
  }

  const response = async () => {

    const data = await rp(options)
    const { openid } = data

    const user = await User.findOne({ where: { openid }, include: [Badge] })

    if (user) {
      const timestamp = Date.now()
      const token = md5Pwd((user.id).toString() + timestamp.toString() + KEY)

      let partner = {}
      if (user.user_other_id !== -1) {
        partner = await User.findOne({ where: { id: user.user_other_id }, include: [Badge] })
      }

      return res.json({
        ...MESSAGE.OK,
        data: {
          user: { ...user.dataValues, password: 0 },
          key: { uid: user.id, token, timestamp },
          partner: { ...partner.dataValues, password: 0 }
        }
      })
    } else {
      // 如果用户不存在，提示前端跳转绑定页面
      return res.json({
        ...MESSAGE.USER_NOT_EXIST,
        data: openid
      })
    }
  }

  response()
})

/* users/bind_account */
router.post('/bind_account', (req, res) => {
  const { account, openid } = req.body
  validate(res, false, account, openid)

  const response = async () => {
    let user = await User.findOne({ where: { account } })
    if (user) {
      // 如果用户存在，就直接绑定
      await User.update({ openid }, { where: { account } })
      return res.json(MESSAGE.OK)
    } else {
      // 如果用户不存在，则先注册再绑定
      const user_code = Date.now().toString().substring(2)
      const userinfo = {
        account,
        password: md5(Date.now()),
        sex: 0,
        name: account,
        user_other_id: -1,
        code: user_code,
        status: 502,
        last_times: 3,
        total_times: 0,
        total_notes: 0,
        mode: 0,
        rate: 0,
        badge_id: -1,
        badges: '',
        ban_id: user_code + ',',
        openid,
        face: 'https://airing.ursb.me/image/twolife/male.png'
      }
      await User.create(userinfo)
      // 提示前端需要完成后续步骤：补充性别与昵称
      user = await User.findOne({ where: { openid } })
      const timestamp = Date.now()
      const token = md5Pwd((user.id).toString() + timestamp.toString() + KEY)
      return res.json({
        ...MESSAGE.USER_NOT_EXIST,
        data: userinfo,
        key: { uid: user.id, token, timestamp },
      })
    }
  }

  response()
})

/* users/wxp_login */
router.post('/wxp_login', (req, res) => {

  // userInfo 可以为空，因为存在用户不同意授权的情况
  // 登录凭证 code 获取 session_key 和 openid
  const { code, userInfo } = req.body
  validate(res, false, code)

  let options = {
    uri: 'https://api.weixin.qq.com/sns/jscode2session',
    qs: {
      appid: WXP_APPID,
      secret: WXP_SECRET,
      js_code: code,
      grant_type: 'authorization_code'
    },
    json: true
  }

  const response = async () => {

    const data = await rp(options)
    const { openid } = data

    if (!openid) {
      return res.json(MESSAGE.REQUEST_ERROR)
    }

    let user = await User.findOne({ where: { openid }, include: [Badge] })

    if (!user) {
      // 如果用户不存在，若是初次登录就替用户注册

      const info = userInfo
      const user_code = Date.now().toString().substring(2)

      await User.create({
        account: openid,
        password: md5(Date.now()),
        sex: info.gender === 1 ? 0 : 1, // 微信登录 0未填写 1男 2女
        name: info.nickName,
        user_other_id: -1,
        code: user_code,
        status: 502,
        last_times: 3,
        total_times: 0,
        total_notes: 0,
        mode: 0,
        rate: 0,
        badge_id: -1,
        badges: '',
        ban_id: user_code + ',',
        openid,
        face: info.avatarUrl
      })

      user = await User.findOne({ where: { openid }, include: [Badge] })
    }

    const timestamp = Date.now()
    const token = md5Pwd((user.id).toString() + timestamp.toString() + KEY)

    let partner = {}
    if (user.user_other_id !== -1) {
      partner = await User.findOne({ where: { id: user.user_other_id }, include: [Badge] })
    }
    partner.password = 0

    return res.json({
      ...MESSAGE.OK,
      data: {
        user: { ...user.dataValues, password: 0 },
        key: { uid: user.id, token, timestamp },
        partner
      },
      is_checking: IS_CHECKING
    })
  }

  response()
})

/* users/feedback */
router.post('/feedback', (req, res) => {

  const { uid, token, timestamp, title, content, type, brand = '', systemVersion = ''} = req.body
  validate(res, false, uid, token, timestamp, title, content, type)

  const { version = '' } = req.query

  let labels = ['discussion']

  switch (type) {
    case 101:
      labels = ['ios', 'bug']
      break
    case 102:
      labels = ['android', 'bug']
      break
    case 103:
      labels = ['微信小程序', 'bug']
      break
    case 200:
      labels = ['feature request']
      break
    case 300:
      break
    default:
      break
  }

  const response = async () => {

    const user = await User.findById(uid)

    const body = `\n![${uid}](${user.face + '-46.jpg'}) ${user.name}\n Brand:${brand}, System:${systemVersion}, Version:${version}\n --- \n${content}`

    let options = {
      uri: 'https://api.github.com/repos/oh-bear/2life/issues',
      method: 'POST',
      body: {
        title,
        body,
        labels
      },
      headers: {
        'Authorization': 'token ' + GITHUB_TOKEN,
        'User-Agent': '2life-APP'
      },
      json: true
    }

    await Feedback.create({
      title,
      content,
      type,
      user_id: uid,
      brand,
      system_version: systemVersion,
      version
    })
    await rp(options) // 此处请求时间太长，前端可以不必等待响应
    return res.json(MESSAGE.OK)
  }

  response()
})

/* users/delete_notification */
router.get('/delete_notification', (req, res) => {

  const { uid, token, timestamp, message_id } = req.query
  validate(res, false, uid, token, timestamp, message_id)

  const response = async () => {
    await Message.destroy({ where: { id: message_id } })
    return res.json(MESSAGE.OK)
  }

  response()
})

/* users/check_token */
router.get('/check_token', (req, res) => {

  const { uid, token, timestamp } = req.query

  const response = async () => {
    if (token !== md5Pwd(uid.toString() + timestamp.toString() + KEY)) {
      return res.json(MESSAGE.TOKEN_ERROR)
    }
    return res.json(MESSAGE.OK)
  }

  response()
})

/* users/check_uid */
router.get('/check_uid', (req, res) => {

  const { uid } = req.query

  const response = async () => {
    const user = await User.findOne({ where: { id: uid } })
    if (!user) {
      return res.json(MESSAGE.USER_NOT_EXIST)
    }
    return res.json(MESSAGE.OK)
  }

  response()
})


/* 通过量表计算用户性格基础
 * content = '2,1,2,1,1,1,2,2,2,1,1,1,2,2,2,'
 */
router.post('/calculate_emotion', (req, res) => {
  const { uid, timestamp, token, content } = req.body
  validate(res, true, uid, timestamp, token)

  const response = async () => {
    const answerE = (content.substring(0, 5)).split(',')
    const answerC = (content.substring(6, 11)).split(',')
    const answerO = (content.substring(12, 17)).split(',')
    const answerA = (content.substring(18, 23)).split(',')
    const answerN = (content.substring(24, 28)).split(',')

    const e = ((answerE[0] * 0.751 + answerE[1] * 0.686 + answerE[2] * 0.673) / 3)
    const c = ((answerC[0] * 0.571 + answerC[1] * 0.707 + answerC[2] * 0.674) / 3)
    const o = ((answerO[0] * 0.619 + answerO[1] * 0.704 + answerO[2] * 0.641) / 3)
    const a = ((answerA[0] * 0.588 + answerA[1] * 0.602 + answerA[2] * 0.633) / 3)
    const n = ((answerN[0] * 0.628 + answerN[1] * 0.708 + answerN[2] * 0.713) / 3)

    const emotions_basis = e + ',' + c + ',' + o + ',' + a + ',' + n

    let max = Math.max(e, c, o, a, n)

    let emotions_types, emotions_type, emotions_report
    let tag = ''

    switch (max) {
      case a:
        tag = 'n'
        emotions_types = ['实干主义者', '心灵多面手', '温和思想家', '自我笃行者']
        emotions_report = `为人谦逊温和，不爱与他人争论。在有意无意中可能会降低自己的原则或者标准，和温柔不同，温和是性格，温柔是态度。你是个温和的人，不爱计较，喜欢忍让，在忍让的过程中，可能会积攒起负能量灾区。一旦导火索被引燃，就容易陷入情绪爆炸。（情绪解读）
你在学业和事业方面是不温不火的，有自己的节奏，或快或慢，但都在自己的掌控当中，不爱跟他人作比较，觉得自己的事情不需要跟他人进行对比。你有一个属于自己的小宇宙。常常沉浸在自我的小世界中。你擅长进行独自深入地思考，常常会有异于常人的灵感迸发。温和的你可以适当的调整自己的步伐，跟随自己的心。心所向，意所达。（学业事业）
温和平静的性格可能帮助你在状态上达到平衡，健康的状态能维持很长时间。但在遇到突发事件时，还可以多增进自己的应激能力。同时可以去尝试新的事物，增长自己的见识和开拓眼界。做一个温文尔雅，内涵饱满的儒雅之士。（健康身心）`
        break
      case e:
        tag = 'e'
        emotions_types = ['恬淡小天使', '温暖小甜心', '元气小青年', '品质小资']
        emotions_report = `你在工作或学习上尽心尽责、勤奋可靠，你认真、合理地安排自己的精力和时间，以便工作时的每一分钟都能够起到最大的作用，从而提高工作的效率和质量，你容易和同事同学建立良好的关系，获得更多的帮助和支持，但有时候过度地要求自己可能会让你陷入病态的完美主义和强迫行为的困境，“要么不做，要做就要做到最好”并不是一句好的座右铭。尝试着告诉自己——我们必须从整体上接纳和遵从我们生命的限制，然后寻找最佳的或是接近最佳的方式来分配我们的时间和精力。（学业）
你容易获得广泛的社会支持力量，一个丰富的、有支持感的社交生活可以有效降低心血管疾病、癌症的风险，且能使人有更长的寿命。归属感和社会联结可降低心理疾病的风险，增加生活意义感。与医生保持良好的沟通，较少出现酗酒或物质滥用等问题。（健康）
你对待学业和工作认真尽责的态度会对伴侣起到一个良好的促进作用，帮助TA也在自己的领域内获得成就。同时，细心体贴的你更容易悉心照料到伴侣的种种情绪，是个十足的小棉袄，乐于付出的你不妨常和伴侣交流对感情的期望更容易让彼此获得令双方都满意的亲密关系。（爱情）`
        break
      case c:
        tag = 'c'
        emotions_types = ['躁动小魔王', '科学小怪人', '极致主义者', '暴躁领袖']
        emotions_report = `对生活抱有极大热忱的你，有时候难免会过度关注生活中负面的信息，尤其是与自身相关的方面，所以总是在一个又一个难以入眠的夜晚细细数着白天是否完成自己的计划、离自己的目标有没有更进一步……总是觉得自己没有达到理想中的自己。但正是反复的思考和担忧让你对目标和方向更加清晰明确，也提前对即将到来的困难做好准备。对风险和困难的敏感是你永不停歇的奋斗源泉。（学业）
尽管容易受到负面信息的影响，造成情绪波动，从而进行间歇性的暴饮暴食和抽烟喝酒，若是长时间陷入焦虑但是通常你对自己的健康状况非常警觉，身体上一点小小的问题也会让你警惕起来，去医院寻求治疗，所以重症疾病很容易被你扼杀在萌芽里。天性外向开朗的你更容易在遇到困境或是心情低落时寻求朋友的帮助。（健康）
虽然有时候神经敏感会让你过度解读伴侣的一言一行，例如TA的面无表情会让你认为是一种冷漠无奈的抵抗。但是你会更加容易和伴侣建立起沟通机制。在沟通这件事上，我们总是误以为自己的非言语线索足够让对方明白我们想表达的意思，但其实，不论在一起多久、多么有默契的伴侣也通常难以做到这一点，这时候需要我们冷静下来，把思绪仔细地告诉对方。（爱情）`
        break
      case o:
        tag = 'o'
        emotions_types = ['厌世大魔王', '灵性创作家', '小世界掌控家', '灵魂多面手']
        emotions_report = `大到漫漫一生，小到一天的安排，你总是对此小心翼翼提心吊胆，似乎失去一丁点的掌控都足以让你窒息抓狂。你很容易受到外界的影响而产生较大的情绪波动，对负面信息比较在意，你经常反复思考和担忧。但也正是这思考，让你比常人更多一份创造力。（情绪解读）
你在学业和事业方面一定是一个相当有创造力的人，你擅长从细节处不断进行深入地思考，从而能够触类旁通不断进行发散，在现有结论的基础上进行再创造。但是有时候不必在细节处过于纠结，而是学会放眼全局，说不定能收获更加开阔的视野。（学业事业）
更加开放的性格可能帮助你在心理上保持健康，心理上的健康不仅指更加积极乐观、对压力的处理能力更强，而且更加容易让你保持健康的饮食和运动习惯。同时你愿意去尝试新的事物，寻求新异和多样性、尝试新的活动更加有利于你在经历创伤事件后的恢复，保持平和开放的心态。（健康身心）`
        break
      case n:
        tag = 'n'
        emotions_types = ['忧郁小王子', '忧伤小绵羊', '谦和小智者', '忧郁小麋鹿']
        emotions_report = `为人低调谦和，虽然不常生气，但是也没有能很好地控制自己的情绪。你经常需要治愈系的聆听者，希望将自己的心事告诉挚友。你身上总是有温暖的光亮。美好的事物各不相同，世界也瞬息万变，而你是一颗永恒的星星，因为自身会发出温暖而明亮的光芒，所以你不惧怕黑暗，你是如此美好，让恐惧烟消云散，你是这个星球上的一点希望。（情绪解读）
你在学业和事业方面一定是一个相当有潜力的人，不论是脑海里还是胸腔中，都藏着一个大大的宇宙。你擅长从细节处不断进行深入地思考，从而能够触类旁通不断进行发散，在现有结论的基础上进行再创造。但是有时候不必在细节处过于纠结，而是学会放眼全局，说不定能收获更加开阔的视野。（学业事业）
更加开放的性格可能帮助你在心理上保持健康，心理上的健康不仅指更加积极乐观、对压力的处理能力更强，而且更加容易让你保持健康的饮食和运动习惯。同时你愿意去尝试新的事物，寻求新异和多样性、尝试新的活动更加有利于你在经历创伤事件后的恢复，保持平和开放的心态。（健康身心）`
        break
      default:
        break
    }

    let type_id = Math.floor(Math.random() * 4)
    emotions_type = emotions_types[type_id]
    let emotions_url = tag + type_id

    // 用户在测试之前写的日记不会记录性格计算
    await User.update({
      emotions_basis,
      emotions: emotions_basis,
      emotions_type,
      emotions_report
    }, { where: { id: uid } })

    return res.json({
      ...MESSAGE.OK,
      data: { emotions_basis, emotions: emotions_basis, emotions_type, emotions_report, emotions_url }
    })
  }

  response()
})

/* /users/update_vip */
router.get('/update_vip', (req, res) => {

  const { uid, timestamp, token, expires } = req.query
  validate(res, true, uid, timestamp, token, expires)

  const response = async () => {
    await User.update({
      vip: 1,
      vip_expires: expires
    }, { where: { id: uid } })

    return res.json(MESSAGE.OK)
  }

  response()
})

/* /users/enroll_activity */
router.get('/enroll_activity', (req, res) => {

  const { uid, timestamp, token, type, code } = req.query
  validate(res, true, uid, timestamp, token, type)

  const response = async () => {
    // 活动报名时间
    if (Date.now() > new Date('2018-08-20 0:0:0').getTime())
      return res.json(MESSAGE.REQUEST_ERROR)

    if (await Activity.findOne({ where: { user_id: uid } }))
      return res.json({ code: 666, message: '用户已报名' })

    const user = await User.findOne({ where: { id: uid } })
    const act = {
      'process': 0,
      'gold': 7,
      'finished': 0,
      'beginline': new Date('2018-08-20 0:0:0').getTime(),
      'deadline': new Date('2018-08-27 0:0:0').getTime(),
    }

    // type: 0 未匹配用户随机匹配, 1 已匹配用户直接报名, 2 邀请匹配
    if (parseInt(type) === 0) {
      if (user.user_other_id !== -1)
        return res.json(MESSAGE.CONNECT_ERROR_ALREADY)

      await Activity.create(Object.assign(act, {
        'user_id': uid,
        'user_other_id': -1,
        'state': user.status,
        'success': 0,
      }))

      JiGuangPush(uid, '你已经成功报名了七夕节活动！敬请期待你的另一半吧！')

      await Message.create({
        title: '你已经成功报名了七夕节活动！敬请期待你的另一半吧！',
        type: 201,
        content: '',
        image: '',
        url: '',
        date: Date.now(),
        user_id: uid
      })
      await user.increment('unread')
    }

    if (parseInt(type) === 1) {
      if (user.user_other_id === -1)
        return res.json(MESSAGE.REQUEST_ERROR)

      let partner = await User.findOne({ where: { id: user.user_other_id } })

      await Activity.create(Object.assign(act, {
        'user_id': uid,
        'user_other_id': user.user_other_id,
        'state': user.status,
        'success': 1,
      }))

      await Activity.create(Object.assign(act, {
        'user_id': user.user_other_id,
        'user_other_id': uid,
        'state': user.status,
        'success': 1,
      }))
      JiGuangPush(uid, `你和${partner.name}成功报名了七夕节活动！快去完成活动赢取奖励吧！`)
      JiGuangPush(partner.id, `你和${user.name}成功报名了七夕节活动！快去完成活动赢取奖励吧！`)

      await Message.create({
        title: `你和${partner.name}成功报名了七夕节活动！快去完成活动赢取奖励吧！`,
        type: 201,
        content: '',
        image: '',
        url: '',
        date: Date.now(),
        user_id: uid
      })
      await user.increment('unread')

      await Message.create({
        title: `你和${user.name}成功报名了七夕节活动！快去完成活动赢取奖励吧！`,
        type: 201,
        content: '',
        image: '',
        url: '',
        date: Date.now(),
        user_id: partner.id
      })
      await partner.increment('unread')

      return res.json({
        user: { ...user.dataValues, password: 0 },
        partner: { ...partner.dataValues, password: 0 },
        ...MESSAGE.OK
      })
    }

    if (parseInt(type) === 2) {
      if (!code)
        return res.json(MESSAGE.PARAMETER_ERROR)

      const user_other = await User.findOne({ where: { code } })

      if (!user_other)
        return res.json(MESSAGE.USER_NOT_EXIST)

      if (user_other.user_other_id !== -1 || user.user_other_id !== -1)
        return res.json(MESSAGE.CONNECT_ERROR_ALREADY)

      // 为2人进行匹配
      await User.update({ status: 1000, user_other_id: user_other.id, connect_at: Date.now() }, { where: { id: uid } })
      await User.update({ status: 1000, user_other_id: uid, connect_at: Date.now() }, { where: { id: user_other.id } })

      // 通知对方被匹配
      JiGuangPush(uid, `你和${user_other.name}的配对成功了！努力完成活动赢取奖励吧！`)
      JiGuangPush(user_other.id, `你和${user.name}配对成功了！努力完成活动赢取奖励吧！`)

      await Message.create({
        title: `你和${user_other.name}的配对成功了！努力完成活动赢取奖励吧！`,
        type: 201,
        content: '',
        image: '',
        url: '',
        date: Date.now(),
        user_id: uid
      })
      await user.increment('unread')

      await Message.create({
        title: `你和${user.name}配对成功了！努力完成活动赢取奖励吧！`,
        type: 201,
        content: '',
        image: '',
        url: '',
        date: Date.now(),
        user_id: user_other.id
      })
      await user_other.increment('unread')

      // 为2人报名活动
      await Activity.create(Object.assign(act, {
        'user_id': uid,
        'user_other_id': user_other.id,
        'state': user.status,
        'success': 1,
      }))

      await Activity.create(Object.assign(act, {
        'user_id': user_other.id,
        'user_other_id': uid,
        'state': user_other.status,
        'success': 1,
      }))

      let partner = await User.findOne({ where: { id: user_other.id } })

      return res.json({
        user: { ...user.dataValues, password: 0 },
        partner: { ...partner.dataValues, password: 0 },
        ...MESSAGE.OK
      })
    }

    return res.json(MESSAGE.OK)
  }

  response()
})

/* /users/update_activity */
router.get('/update_activity', (req, res) => {

  const { uid, timestamp, token } = req.query
  validate(res, true, uid, timestamp, token)

  const response = async () => {
    // 活动进行时间
    if ((new Date('2018-08-20 0:0:0').getTime() > Date.now()) || (Date.now() > new Date('2018-08-27 0:0:0').getTime()))
      return res.json(MESSAGE.REQUEST_ERROR)

    const act = await Activity.findOne({ where: { user_id: uid } })

    if (!act)
      return res.json(MESSAGE.REQUEST_ERROR)

    const user = await User.findOne({ where: { id: uid } })

    // 中途解除匹配,
    // 一天时间给后台修改随机匹配的user.user_other_id和activity的success
    if ((user.user_other_id !== act.user_other_id) && (new Date('2018-08-21').getTime() < Date.now())) {
      await Activity.update({ 'finished': -1 }, { where: { user_id: uid } })
      return res.json(MESSAGE.REQUEST_ERROR)
    }

    // 没有连续写日记
    if ((new Date().getDate() - 20) > act.process) {
      await Activity.update({ 'finished': -2 }, { where: { user_id: uid } })
      return res.json(MESSAGE.REQUEST_ERROR)
    }

    if ((act.process + 1) === act.gold) {
      await Activity.update({
        'process': act.process + 1,
        'finished': 1
      }, { where: { user_id: uid } })
    } else {
      await Activity.update({ 'process': new Date().getDate() - 19 }, { where: { user_id: uid } })
    }

    return res.json(MESSAGE.OK)
  }

  response()
})

/* /users/get_activity */
router.get('/get_activity', (req, res) => {

  const { uid, timestamp, token } = req.query
  validate(res, true, uid, timestamp, token)

  const response = async () => {
    if ((new Date('2018-08-15').getTime() > Date.now()) || (Date.now() > new Date('2018-08-27').getTime()))
      return res.json(MESSAGE.REQUEST_ERROR)

    const act = await Activity.findOne({ where: { user_id: uid } })

    if (!act)
      return res.json(MESSAGE.REQUEST_ERROR)

    let partner = { dataValues: {} }
    if (act.user_other_id !== -1) {
      partner = await User.findOne({ where: { id: act.user_other_id } })
    }

    const user = await User.findOne({ where: { id: uid } })

    return res.json({
      user: { ...user.dataValues, password: 0 },
      partner: { ...partner.dataValues, password: 0 },
      act,
      ...MESSAGE.OK
    })
  }

  response()
})

router.post('/reset_password', (req, res) => {

  const { account, password, code, timestamp } = req.body

  validate(res, false, account, password, code, timestamp)

  const findCode = async () => {
    return await Code.findOne({ where: { code, timestamp } })
  }

  const response = async () => {
    const code = await findCode()
    if (code) {
      const user = await User.findOne({ where: { account } })
      if (!user) {
        return res.json(MESSAGE.USER_NOT_EXIST)
      } else {
        await User.update({ password: md5(password) }, { where: { account } })
        return res.json(MESSAGE.OK)
      }
    }
    return res.json(MESSAGE.CODE_ERROR)
  }

  response()
})

module.exports = router

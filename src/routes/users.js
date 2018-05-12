import express from 'express'

import { User, Code, Message, Note, Badge } from '../models'

import md5 from 'md5'

import https from 'https'
import querystring from 'querystring'

import {
  MESSAGE,
  KEY,
  YUNPIAN_APIKEY,
  validate,
  md5Pwd,
  JiGuangPush
} from '../config'

const router = express.Router()

/* users/code */
router.post('/code', (req, res) => {

  const { account } = req.body
  validate(res, false, account)

  const now = Date.now()
  const code = Math.floor(Math.random() * 8999 + 1000)

  const postData = {
    mobile: account,
    text: '【双生APP】您的验证码是' + code,
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
    return await Code.findOne({ where: { account, code, timestamp, used: false } })
  }

  const response = async () => {
    const code = await findCode()
    if (code) {
      const user = await User.findOne({ where: { account } })
      if (user) {
        return res.json(MESSAGE.USER_EXIST)
      } else {
        const userinfo = {
          account,
          password: md5(password),
          sex: 0,
          name: account,
          user_other_id: -1,
          code: '0' + Math.floor((Math.random() * 89999 + 10000)),
          status: 502,
          last_times: 3,
          total_times: 0,
          total_notes: 0,
          badge_id: -1,
          badges: '',
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
    if (user.user_other_id !== -1 && user.status === 1) {
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
    return res.json({
      ...MESSAGE.OK,
      data: { ...user.dataValues, password: 0 }
    })
  }

  response()
})

/* users/update */
router.post('/update', (req, res) => {

  const { uid, timestamp, token, sex, name, face, status, latitude, longitude, badge_id, badges } = req.body
  validate(res, true, uid, timestamp, token, sex, name, face, status, latitude, longitude, badge_id)

  const response = async () => {
    await User.update({ name, sex, face, status, latitude, longitude, badge_id, badges }, { where: { id: uid } })
    return res.json(MESSAGE.OK)
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

    // TODO: 彼此加入匹配黑名单

    // 用户状态变为解除后的临界状态
    // 需要用户在匹配页面重新设置状态
    // 否则无法被匹配到
    await User.update({ status: 0, user_other_id: -1 }, { where: { id: user.user_other_id } })
    await User.update({ status: 0, user_other_id: -1 }, { where: { id: uid } })

    // 清空双方的喜欢记录
    await Note.update({ is_liked: 0 }, { where: { user_id: [uid, user.user_other_id] } })

    return res.json(MESSAGE.OK)
  }

  response()
})

/* users/connect_by_random */
router.get('/connect_by_random', (req, res) => {

  // TODO: 不允许匹配自己

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
        status: { 'lte': 501 },
        sex: 1,
        mode: user.mode > 50 ? { 'lte': 50 } : { 'gte': 50 },
        total_notes: { 'gte': 1 }
      }
      break
    case 102:
      condition = {
        status: { 'lte': 501 },
        sex: 1,
        mode: user.mode > 50 ? { 'gte': 50 } : { 'lte': 50 },
        total_notes: { 'gte': 1 }
      }
      break
    case 103:
      condition = {
        status: { 'lte': 501 },
        sex: 1,
        total_notes: { 'gte': 1 }
      }
      break
    case 111:
      condition = {
        status: { 'lte': 501 },
        sex: 0,
        mode: user.mode > 50 ? { 'lte': 50 } : { 'gte': 50 },
        total_notes: { 'gte': 1 }
      }
      break
    case 112:
      condition = {
        status: { 'lte': 501 },
        sex: 0,
        mode: user.mode > 50 ? { 'gte': 50 } : { 'lte': 50 },
        total_notes: { 'gte': 1 }
      }
      break
    case 113:
      condition = {
        status: { 'lte': 501 },
        sex: 0,
        total_notes: { 'gte': 1 }
      }
      break
    case 201:
      condition = {
        status: { 'lte': 501 },
        sex: 0,
        mode: user.mode > 50 ? { 'lte': 50 } : { 'gte': 50 },
        total_notes: { 'gte': 1 }
      }
      break
    case 202:
      condition = {
        status: { 'lte': 501 },
        sex: 0,
        mode: user.mode > 50 ? { 'gte': 50 } : { 'lte': 50 },
        total_notes: { 'gte': 1 }
      }
      break
    case 203:
      condition = {
        status: { 'lte': 501 },
        sex: 0,
        total_notes: { 'gte': 1 }
      }
      break
    case 211:
      condition = {
        status: { 'lte': 501 },
        sex: 1,
        mode: user.mode > 50 ? { 'lte': 50 } : { 'gte': 50 },
        total_notes: { 'gte': 1 }
      }
      break
    case 212:
      condition = {
        status: { 'lte': 501 },
        sex: 1,
        mode: user.mode > 50 ? { 'gte': 50 } : { 'lte': 50 },
        total_notes: { 'gte': 1 }
      }
      break
    case 213:
      condition = {
        status: { 'lte': 501 },
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

    const candidates = await User.findAll({ where: condition })

    if (!candidates[0]) return res.json(MESSAGE.USER_NOT_EXIST)

    const partner = candidates[Math.floor(Math.random() * candidates.length)]

    if (user.last_times === 1) {
      await User.update({ status: 501, user_other_id: partner.id, connect_at: Date.now() }, { where: { id: uid } })
    } else {
      await User.update({ status: 1000, user_other_id: partner.id }, { where: { id: uid } })
    }

    await User.update({ status: 1000, user_other_id: uid }, { where: { id: partner.id } })

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

  // TODO: 不允许匹配自己

  const { uid, timestamp, token, code } = req.query
  validate(res, true, uid, timestamp, token, code)

  const response = async () => {
    const user = await User.findOne({ where: { id: uid } })
    const partner = await User.findOne({ where: { code } })

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
    if (user.status === 1000 || partner.status === 1000)
      return res.json(MESSAGE.CONNECT_ERROR_ALREADY)

    if (user.last_times === 1) {
      await User.update({ status: 501, user_other_id: partner.id, connect_at: Date.now() }, { where: { id: uid } })
    } else {
      await User.update({ status: 1000, user_other_id: partner.id }, { where: { id: uid } })
    }

    await User.update({ status: 1000, user_other_id: uid }, { where: { id: partner.id } })

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
    const data = await Message.findAll({ where: { user_id: uid }, order: 'date DESC' })
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

module.exports = router

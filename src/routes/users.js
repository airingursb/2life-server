import express from 'express'

import {User, Code, Message} from '../models'
import * as Model from '../models/util'

import md5 from 'md5'

import https from 'https'
import querystring from 'querystring'

import {MESSAGE, KEY, YUNPIAN_APIKEY, validate, md5Pwd} from '../config'

const router = express.Router()

/* users/code */
router.post('/code', (req, res) => {

  const {user_account} = req.body

  validate(res, false, user_account)

  const now = new Date().getTime()

  const code = Math.floor(Math.random() * 8999 + 1000)

  const postData = {
    mobile: user_account,
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
    user_account,
    code,
    timestamp: now,
    used: false
  }

  const sendMsg = async () => {
    const req = https.request(options, (res) => {
      res.setEncoding('utf8')
    })
    req.write(postContent)
    req.end()
    return true
  }

  const response = async () => {
    const results = await Model.findAll(Code, {user_account, used: false})
    if (results[0] !== undefined) {
      if (now - results[0].timestamp < 600000) {
        return res.json(MESSAGE.REQUEST_ERROR)
      }
    }
    await Model.create(Code, model)
    await sendMsg()
    return res.json({...MESSAGE.OK, timestamp: now})
  }

  response()
})

/* users/register */
router.post('/register', (req, res) => {

  const {user_account, user_password, user_name, code, timestamp} = req.body

  validate(res, false, user_account, user_password, user_name, code, timestamp)

  const findCode = async () => {
    return await Model.findOne(Code, {user_account, code, timestamp, used: false})
  }

  const response = async () => {
    const code = await findCode()
    if (code) {
      const user = await Model.findOne(User, {user_account})
      if (user) {
        return res.json(MESSAGE.USER_EXIST)
      } else {
        const userinfo = {
          user_account,
          user_password: md5(user_password),
          user_sex: 0,
          user_name,
          user_other_id: -1,
          user_code: '0' + Math.floor((Math.random() * 89999 + 10000)),
          user_message: 1,
          user_face: 'https://airing.ursb.me/image/twolife/male.png'
        }
        await Model.create(User, userinfo)
        return res.json({...MESSAGE.OK, data: user})
      }
    }
    return res.json(MESSAGE.CODE_ERROR)
  }

  response()
})

/* users/login */
router.post('/login', (req, res) => {

  const {user_account, user_password} = req.body

  validate(res, false, user_account, user_password)

  const response = async () => {
    const user = await Model.findOne(User, {user_account})
    if (!user) return res.json(MESSAGE.USER_NOT_EXIST)

    if (user.user_password !== md5(user_password))
      return res.json(MESSAGE.PASSWORD_ERROR)

    const token = md5Pwd((user.id).toString() + Date.now().toString() + KEY)

    let partner = {}
    if (user.user_other_id !== -1 && user.user_other_id !== -404)
      partner = await Model.findOne(User, {id: user.user_other_id})

    return res.json({
      ...MESSAGE.OK,
      data: {...user.dataValues, user_password: 0, uid: user.id, token, timestamp: Date.now()},
      partner: {...partner.dataValues, user_password: 0},
    })
  }

  response()
})

/* users/user */
router.post('/user', (req, res) => {

  const {uid, timestamp, token, user_id} = req.body

  validate(res, true, uid, timestamp, token, user_id)

  const response = async () => {
    const user = await Model.findOne(User, {id: user_id})
    if (!user)
      return res.json(MESSAGE.USER_NOT_EXIST)
    return res.json({
      ...MESSAGE.OK,
      data: {...user, user_password: 0},
    })
  }

  response()
})

/* users/update */
router.post('/update', (req, res) => {

  const {uid, timestamp, token, user_sex, user_name, user_face} = req.body

  validate(res, true, uid, timestamp, token, user_sex, user_name, user_face)

  const response = async () => {
    await Model.update(User, {user_name, user_sex, user_face}, {id: user_id})
    const user = await Model.findOne(User, {id: user_id})
    return res.json({
      ...MESSAGE.OK,
      data: {...user, user_password: 0, uid: user.id, token, timestamp},
    })
  }

  response()
})

/* users/close_connect */
router.post('/close_connect', (req, res) => {

  const {uid, timestamp, token, user_other_id} = req.body

  validate(res, true, uid, timestamp, token, user_other_id)

  const response = async () => {
    await Model.update(User, {user_other_id: -404}, {id: user_id})
    if (user_other_id !== -1) {
      await Model.update(User, {user_other_id: -1}, {id: user_other_id})
      return res.json(MESSAGE.OK)
    }
    return res.json(MESSAGE.OK)
  }

  response()
})

/* users/connect */
router.post('/connect', (req, res) => {

  const {uid, timestamp, token, sex} = req.body

  validate(res, true, uid, timestamp, token, sex)

  const response = async () => {
    const users = await Model.findAll(User, {user_sex: sex === 0 ? 1 : 0, user_other_id: -1})
    if (!users[0]) return res.json(MESSAGE.USER_NOT_EXIST)
    const user = users[Math.floor(Math.random() * users.length)]
    await Model.update(User, {user_other_id: user.id}, {id: uid})
    await Model.update(User, {user_other_id: uid}, {id: user.id})
    return res.json({
      ...MESSAGE.OK,
      data: {...user, user_password: 0, user_id: user.user_other_id}
    })
  }

  response()
})

/* users/connect_by_id */
router.post('/connect_by_id', (req, res) => {

  const {uid, timestamp, token, sex, code} = req.body

  validate(res, true, uid, timestamp, token, sex, code)

  const response = async () => {
    const users = await Model.findAll(User, {user_code: code, user_sex: sex === 0 ? 1 : 0, user_other_id: -1})
    if (!users[0]) return res.json(MESSAGE.USER_NOT_EXIST)
    const user = users[Math.floor(Math.random() * users.length)]
    await Model.update(User, {user_other_id: user.id}, {id: uid})
    await Model.update(User, {user_other_id: uid}, {id: user.id})
    return res.json({
      ...MESSAGE.OK,
      data: {...user, user_password: 0, user_id: user.user_other_id}
    })
  }

  response()
})

/* users/disconnect */
router.post('/disconnect', (req, res) => {

  const {uid, timestamp, token} = req.body

  validate(res, true, uid, timestamp, token)

  const response = async () => {
    const users = await Model.findAll(User, {user_other_id: uid})

    const ids = await users.map(user => {
      return user.dataValues.id
    })
    await Model.update(User, {user_other_id: -1}, {id: ids})
    return res.json(MESSAGE.OK)
  }

  response()
})

/* users/feedback */
router.post('/feedback', (req, res) => {

  const {uid, timestamp, token, contact, content} = req.body

  validate(res, true, uid, timestamp, token, contact, content)

  const response = async () => {
    const user = await Model.findOne(User, {id: uid})
    if (!user) return res.json(MESSAGE.USER_NOT_EXIST)
    user.createFeedback({contact, content})
    return res.json(MESSAGE.OK)
  }

  response()
})

/* users/show_notification */
router.post('/show_notification', (req, res) => {

  const {uid, timestamp, token} = req.body

  validate(res, true, uid, timestamp, token)

  const response = async () => {
    const messages = await Model.findOne(Message, {}, {'order': 'message_date DESC'})
    const data = await messages.map(message => {
      return {
        ...message.dataValues,
        time: message.dataValues.message_date,
        title: message.dataValues.message_date,
        content: message.dataValues.message_content,
        image: message.dataValues.message_image,
        type: message.dataValues.message_type,
        url: message.dataValues.message_url,
      }
    })
    await Model.update(User, {user_message: 0}, {id: uid})
    return res.json({...MESSAGE.OK, data})
  }

  response()
})

module.exports = router

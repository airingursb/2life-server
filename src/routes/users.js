import express from 'express'

import {User, Code, Message} from '../models'
import * as Model from '../models/util'

import md5 from 'md5'

import https from 'https'
import querystring from 'querystring'

import {MESSAGE, KEY, YUNPIAN_APIKEY, checkToken, md5Pwd} from '../config'

const router = express.Router()

/* users/code */
router.post('/code', (req, res) => {

  const {user_account} = req.body
  if (typeof user_account === 'undefined' || user_account === null) {
    return res.json({code: 400, msg: MESSAGE.PARAMETER_ERROR})
  }
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
        return res.json({code: 501, msg: MESSAGE.REQUEST_ERROR})
      }
    }
    await Model.create(Code, model)
    await sendMsg()
    return res.json({code: 200, msg: MESSAGE.SUCCESS, timestamp: now})
  }

  response()
})

/* users/register */
router.post('/register', (req, res) => {

  const {user_account, user_password, user_name, code, timestamp} = req.body

  if (typeof user_account === 'undefined' || user_account === null
    || typeof user_password === 'undefined' || user_password === null
    || typeof user_name === 'undefined' || user_name === null
    || typeof code === 'undefined' || code === null
    || typeof timestamp === 'undefined' || timestamp === null) {
    return res.json({code: 400, msg: MESSAGE.PARAMETER_ERROR})
  }

  const findCode = async () => {
    return await Model.findOne(Code, {user_account, code, timestamp, used: false})
  }

  const response = async () => {
    const code = await findCode()
    if (code) {
      const user = await Model.findOne(User, {user_account})
      if (user) {
        return res.json({code: 1004, msg: MESSAGE.USER_ALREADY_EXIST})
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
        return res.json({code: 0, data: user, msg: MESSAGE.SUCCESS})
      }
    }
    return res.json({code: 1003, msg: MESSAGE.CODE_ERROR})
  }

  response()
})

/* users/login */
router.post('/login', (req, res) => {

  const {user_account, user_password} = req.body

  if (typeof user_account === 'undefined' || user_account === null
    || typeof user_password === 'undefined' || user_password === null) {
    return res.json({code: 400, msg: MESSAGE.PARAMETER_ERROR})
  }

  const response = async () => {
    const user = await Model.findOne(User, {user_account})
    if (!user)
      return res.json({code: 1002, msg: MESSAGE.USER_NOT_EXIST})

    if (user.user_password !== md5(user_password))
      return res.json({code: 1003, msg: MESSAGE.PASSWORD_ERROR})

    const token = md5Pwd((user.id).toString() + Date.now().toString() + KEY)

    return res.json({
      code: 0,
      data: {...user.dataValues, user_password: 0, uid: user.id, token, timestamp: Date.now()},
      msg: MESSAGE.SUCCESS
    })
  }

  response()
})

/* users/check */
router.post('/check', (req, res) => {
  const {uid, timestamp, token} = req.body

  if (typeof uid === 'undefined' || uid === null
    || typeof token === 'undefined' || token === null
    || typeof timestamp === 'undefined' || timestamp === null) {
    return res.json({code: 400, msg: MESSAGE.PARAMETER_ERROR})
  }

  if (checkToken(uid, timestamp, token))
    return res.json({code: 0, msg: MESSAGE.SUCCESS})
  else
    return res.json({code: 4000, msg: MESSAGE.USER_NOT_LOGIN})
})

/* users/user */
router.post('/user', (req, res) => {

  // TODO: 校验 TOKEN
  const {user_id} = req.body

  if (typeof user_id === 'undefined' || user_id === null) {
    return res.json({code: 400, msg: MESSAGE.PARAMETER_ERROR})
  }

  const response = async () => {
    const user = await Model.findOne(User, {id: user_id})
    if (!user)
      return res.json({code: 1002, msg: MESSAGE.USER_NOT_EXIST})
    return res.json({
      code: 0,
      data: {...user, password: 0, uid: user.id},
      msg: MESSAGE.SUCCESS
    })
  }

  response()
})

/* users/update */
router.post('/update', (req, res) => {

  const {uid, timestamp, token, user_sex, user_name, user_face} = req.body

  if (typeof uid === 'undefined' || uid === null
    || typeof token === 'undefined' || token === null
    || typeof timestamp === 'undefined' || timestamp === null
    || typeof user_sex === 'undefined' || user_sex === null
    || typeof user_name === 'undefined' || user_name === null
    || typeof user_face === 'undefined' || user_face === null) {
    return res.json({code: 400, msg: MESSAGE.PARAMETER_ERROR})
  }

  if (!checkToken(uid, timestamp, token))
    return res.jsonp({code: 500, msg: MESSAGE.TOKEN_ERROR})

  const response = async () => {
    await Model.update(User, {user_name, user_sex, user_face}, {id: user_id})
    const user = await Model.findOne(User, {id: user_id})
    return res.json({
      code: 0,
      data: {...user, password: 0, uid: user.id, token, timestamp},
      msg: MESSAGE.SUCCESS
    })
  }

  response()
})

/* users/close_connect */
router.post('/close_connect', (req, res) => {

  const {uid, timestamp, token, user_other_id} = req.body

  if (typeof uid === 'undefined' || uid === null
    || typeof token === 'undefined' || token === null
    || typeof timestamp === 'undefined' || timestamp === null
    || typeof user_other_id === 'undefined' || user_other_id === null) {
    return res.json({code: 400, msg: MESSAGE.PARAMETER_ERROR})
  }

  if (!checkToken(uid, timestamp, token))
    return res.jsonp({code: 500, msg: MESSAGE.TOKEN_ERROR})

  const response = async () => {
    await Model.update(User, {user_other_id: -404}, {id: user_id})
    if (user_other_id !== -1) {
      await Model.update(User, {user_other_id: -1}, {id: user_other_id})
      return res.json({code: 0, msg: MESSAGE.SUCCESS})
    }
    return res.json({code: 0, msg: MESSAGE.SUCCESS})
  }

  response()
})

/* users/connect */
router.post('/connect', (req, res) => {

  const {uid, timestamp, token, sex} = req.body

  if (typeof uid === 'undefined' || uid === null
    || typeof token === 'undefined' || token === null
    || typeof timestamp === 'undefined' || timestamp === null
    || typeof sex === 'undefined' || sex === null) {
    return res.json({code: 400, msg: MESSAGE.PARAMETER_ERROR})
  }

  if (!checkToken(uid, timestamp, token))
    return res.jsonp({code: 500, msg: MESSAGE.TOKEN_ERROR})

  const response = async () => {
    const users = await Model.findAll(User, {user_sex: sex === 0 ? 1 : 0, user_other_id: -1})
    if (!users[0])
      return res.json({code: 1001, msg: MESSAGE.USER_NOT_EXIST})
    const user = users[Math.floor(Math.random() * users.length)]
    await Model.update(User, {user_other_id: user.id}, {id: uid})
    await Model.update(User, {user_other_id: uid}, {id: user.id})
    return res.json({
      code: 0,
      msg: MESSAGE.SUCCESS,
      data: {...user, password: 0, user_id: user.user_other_id, uid: user.id}
    })
  }

  response()
})

/* users/connect_by_id */
router.post('/connect_by_id', (req, res) => {

  const {uid, timestamp, token, sex, code} = req.body

  if (typeof uid === 'undefined' || uid === null
    || typeof token === 'undefined' || token === null
    || typeof timestamp === 'undefined' || timestamp === null
    || typeof sex === 'undefined' || sex === null
    || typeof code === 'undefined' || code === null) {
    return res.json({code: 400, msg: MESSAGE.PARAMETER_ERROR})
  }

  if (!checkToken(uid, timestamp, token))
    return res.jsonp({code: 500, msg: MESSAGE.TOKEN_ERROR})

  const response = async () => {
    const users = await Model.findAll(User, {user_code: code, user_sex: sex === 0 ? 1 : 0, user_other_id: -1})
    if (!users[0])
      return res.json({code: 1001, msg: MESSAGE.USER_NOT_EXIST})
    const user = users[Math.floor(Math.random() * users.length)]
    await Model.update(User, {user_other_id: user.id}, {id: uid})
    await Model.update(User, {user_other_id: uid}, {id: user.id})
    return res.json({
      code: 0,
      msg: MESSAGE.SUCCESS,
      data: {...user, password: 0, user_id: user.user_other_id, uid: user.id}
    })
  }

  response()
})

/* users/disconnect */
router.post('/disconnect', (req, res) => {

  const {uid, timestamp, token} = req.body

  if (typeof uid === 'undefined' || uid === null
    || typeof token === 'undefined' || token === null
    || typeof timestamp === 'undefined' || timestamp === null) {
    return res.json({code: 400, msg: MESSAGE.PARAMETER_ERROR})
  }

  if (!checkToken(uid, timestamp, token))
    return res.jsonp({code: 500, msg: MESSAGE.TOKEN_ERROR})

  const response = async () => {
    const users = await Model.findAll(User, {user_other_id: uid})

    const ids = await users.map(user => {
      return user.dataValues.id
    })
    await Model.update(User, {user_other_id: -1}, {id: ids})
    return res.json({code: 0, msg: MESSAGE.SUCCESS})
  }

  response()
})

/* users/feedback */
router.post('/feedback', (req, res) => {

  const {uid, timestamp, token, contact, content} = req.body

  if (typeof uid === 'undefined' || uid === null
    || typeof token === 'undefined' || token === null
    || typeof timestamp === 'undefined' || timestamp === null
    || typeof contact === 'undefined' || contact === null
    || typeof content === 'undefined' || content === null) {
    return res.json({code: 400, msg: MESSAGE.PARAMETER_ERROR})
  }

  if (!checkToken(uid, timestamp, token))
    return res.jsonp({code: 500, msg: MESSAGE.TOKEN_ERROR})

  const response = async () => {
    const user = await Model.findOne(User, {id: uid})
    if (!user)
      return res.json({code: 1001, msg: MESSAGE.USER_NOT_EXIST})
    user.createFeedback({contact, content})
    return res.json({code: 0, msg: MESSAGE.SUCCESS})
  }

  response()
})

/* users/show_notification */
router.post('/show_notification', (req, res) => {

  const {uid, timestamp, token} = req.body

  if (typeof uid === 'undefined' || uid === null
    || typeof token === 'undefined' || token === null
    || typeof timestamp === 'undefined' || timestamp === null) {
    return res.json({code: 400, msg: MESSAGE.PARAMETER_ERROR})
  }

  if (!checkToken(uid, timestamp, token))
    return res.jsonp({code: 500, msg: MESSAGE.TOKEN_ERROR})

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
    return res.json({code: 0, msg: MESSAGE.SUCCESS, data})
  }

  response()
})

module.exports = router

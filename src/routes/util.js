import express from 'express'
import qiniu from 'qiniu'
import crypto from 'crypto'

import { User, Message } from '../models'

import {
  QINIU_ACCESS,
  QINIU_SECRET,
  BUCKET,
  MESSAGE,
  ADMIN_USER,
  ADMIN_PASSWORD,
  validate,
  JiGuangPush,
  QCLOUD_APPID,
  QCLOUD_SECRETID,
  QCLOUD_SECRETKEY,
  NLP_ID,
  NLP_SECRET,
  WXP_APPID,
  WXP_SECRET
} from '../config/index'

import Promise from 'Promise'

import rp from 'request-promise'

import Capi from 'qcloudapi-sdk'
import { YUNPIAN_APIKEY } from "../config";

const capi = new Capi({
  SecretId: NLP_ID,
  SecretKey: NLP_SECRET,
  serviceType: 'wenzhi'
})


const router = express.Router()
qiniu.conf.ACCESS_KEY = QINIU_ACCESS
qiniu.conf.SECRET_KEY = QINIU_SECRET

/* 获取七牛token */
router.get('/qiniu_token', (req, res) => {

  const { uid, timestamp, token, filename } = req.query
  validate(res, true, uid, timestamp, token, filename)

  const putPolicy = new qiniu.rs.PutPolicy(BUCKET + ':' + filename)
  const data = putPolicy.token()

  return res.json({ ...MESSAGE.OK, data })
})

/* 获取 OCR 签名*/
router.get('/get_ocr_sign', (req, res) => {

  const { uid, timestamp, token } = req.query
  validate(res, true, uid, timestamp, token)

  const currentTime = Math.round(Date.now() / 1000)
  const expiredTime = currentTime + 30 * 24 * 60 * 60
  const rand = Math.round(Math.random() * (2 ** 32))
  const origin = `a=${QCLOUD_APPID}&k=${QCLOUD_SECRETID}&e=${expiredTime}&t=${currentTime}&r=${rand}`

  const data = Buffer.from(origin, 'utf8')
  const signTmp = crypto.createHmac('sha1', QCLOUD_SECRETKEY).update(data).digest()
  const bin = Buffer.concat([signTmp, data])
  const sign = Buffer.from(bin).toString('base64')

  return res.json({ ...MESSAGE.OK, data: sign })
})

/* NLP 情感分析接口 */
router.post('/get_nlp_result', (req, res) => {

  const { uid, timestamp, token, content } = req.body
  validate(res, true, uid, timestamp, token)

  const callApi = () => {
    return new Promise((resolve, reject) => {
      capi.request({
        Region: 'gz',
        Action: 'TextSentiment',
        content
      }, (err, d) => {
        resolve(d)
        reject(err)
      })
    })
  }

  const response = async () => {
    const data = await callApi()
    const { positive } = data

    const user = await User.findOne({ where: { id: uid } })

    let total_notes = user.total_notes
    let total_modes = user.mode * total_notes

    await User.update({
      total_notes: total_notes + 1,
      mode: Math.floor((total_modes + Math.floor(positive * 100)) / (total_notes + 1))
    }, { where: { id: uid } })

    return res.json({ ...MESSAGE.OK, data: positive })
  }

  response()
})

/* 小程序获取access_token
* 文档：https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421140183
*/
router.get('/access_token', (req, res) => {
  const { uid, timestamp, token } = req.query
  validate(res, true, uid, timestamp, token)

  const response = async () => {
    const options = {
      uri: 'https://api.weixin.qq.com/cgi-bin/token',
      qs: {
        grant_type: 'client_credential',
        appid: WXP_APPID,
        secret: WXP_SECRET
      },
      json: true
    }
    const data = await rp(options)
    return res.json({ ...MESSAGE.OK, data: { ...data, timestamp: Date.now() } })
  }
  response()
})

/* 后台发送通知 */
router.get('/push_message', (req, res) => {
  JiGuangPush(1, '您被另一半解除匹配了:(，多写日记来记录自己的生活吧！')

  const response = async () => {
    await Message.create({
      title: 'Airing 成功匹配到了您，成为您的另一半',
      type: 201,
      content: '',
      image: '',
      url: '',
      date: Date.now(),
      user_id: 1
    })
    return res.json(MESSAGE.OK)
  }
  response()
})

/* 备份服务端日志 */
router.post('/save_logs', (req, res) => {

  const { admin, password } = req.body

  validate(res, false, admin, password)

  const response = async () => {

    if (admin === ADMIN_USER && password === ADMIN_PASSWORD) {


      return res.json(MESSAGE.OK)
    }
  }

  response()
})

module.exports = router

import express from 'express'
import qiniu from 'qiniu'
import crypto from 'crypto'

import { Message } from '../models'

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
  QCLOUD_SECRETKEY
} from '../config/index'

const router = express.Router()
qiniu.conf.ACCESS_KEY = QINIU_ACCESS
qiniu.conf.SECRET_KEY = QINIU_SECRET

/* 获取七牛token */
router.get('/qiniu_token', (req, res) => {

  const {uid, timestamp, token, filename} = req.query
  validate(res, true, uid, timestamp, token, filename)

  const putPolicy = new qiniu.rs.PutPolicy(BUCKET + ':' + filename)
  const data = putPolicy.token()

  return res.json({...MESSAGE.OK, data})
})

/* 获取 OCR 签名*/
router.get('/get_ocr_sign', (req, res) => {

  const {uid, timestamp, token} = req.query
  validate(res, true, uid, timestamp, token)

  const currentTime = Math.round(Date.now() / 1000)
  const expiredTime = currentTime + 30 * 24 * 60 * 60
  const rand = Math.round(Math.random() * (2 ** 32))
  const origin = `a=${QCLOUD_APPID}&k=${QCLOUD_SECRETID}&e=${expiredTime}&t=${currentTime}&r=${rand}`

  const data = Buffer.from(origin, 'utf8')
  const signTmp = crypto.createHmac('sha1', QCLOUD_SECRETKEY).update(data).digest()
  const bin = Buffer.concat([signTmp, data])
  const sign = Buffer.from(bin).toString('base64')

  return res.json({...MESSAGE.OK, data: sign})
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

  const {admin, password} = req.body

  validate(res, false, admin, password)

  const response = async () => {

    if (admin === ADMIN_USER && password === ADMIN_PASSWORD) {


      return res.json(MESSAGE.OK)
    }
  }

  response()
})

module.exports = router

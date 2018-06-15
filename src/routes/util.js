import express from 'express'
import qiniu from 'qiniu'
import { Message } from '../models'

import {
  QINIU_ACCESS,
  QINIU_SECRET,
  BUCKET,
  MESSAGE,
  ADMIN_USER,
  ADMIN_PASSWORD,
  validate,
  JiGuangPush
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

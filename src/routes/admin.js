import express from 'express'

import {
  MESSAGE,
  ADMIN_USER,
  ADMIN_PASSWORD,
  validate,
  JiGuangPush,
} from '../config'

const router = express.Router()

// 反馈回复接口：推送+消息
router.post('/reply', (req, res) => {

  const { account, password, uid, content } = req.body

  validate(res, false, uid, account, password, content)


  const response = async () => {
    if (account !== ADMIN_USER || password !== ADMIN_PASSWORD) {
      return res.jsonp(MESSAGE.PASSWORD_ERROR)
    }

    JiGuangPush(uid, content)
    await Message.create({
      title: content,
      type: 101,
      content: '',
      image: '',
      url: '',
      date: Date.now(),
      user_id: uid
    })

    return res.jsonp(MESSAGE.OK)
  }

  response()
})

module.exports = router

import express from 'express'

import {
  MESSAGE,
  ADMIN_USER,
  ADMIN_PASSWORD,
  validate,
  JiGuangPush,
} from '../config'

import { User, Message } from '../models'

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


// 用户列表接口
router.get('/user/list', (req, res) => {

  const { account, password, page, limit } = req.body

  validate(res, false, uid, account, password, page, limit)

  const response = async () => {

    if (page <= 0 || limit < 1) {
      return res.jsonp(MESSAGE.REQUEST_ERROR)
    }

    if (account !== ADMIN_USER || password !== ADMIN_PASSWORD) {
      return res.jsonp(MESSAGE.PASSWORD_ERROR)
    }

    const users = await User.findAll({ offset: page * limit, limit })
    return res.jsonp({ ...MESSAGE.OK, data: users })
  }

  response()
})

// 修改匹配次数接口
router.post('/user/last_times', (req, res) => {

  const { account, password, uid, last_times } = req.body

  validate(res, false, uid, account, password, last_times)

  const response = async () => {

    if (last_times < 0) {
      return res.jsonp(MESSAGE.REQUEST_ERROR)
    }

    if (account !== ADMIN_USER || password !== ADMIN_PASSWORD) {
      return res.jsonp(MESSAGE.PASSWORD_ERROR)
    }

    await User.update({ last_times }, { where: { id: uid } })

    return res.jsonp(MESSAGE.OK)
  }

  response()
})


// 修改会员时间接口
router.post('/user/vip_expires', (req, res) => {

  const { account, password, uid, vip_expires, vip } = req.body

  validate(res, false, uid, account, password, vip_expires, vip)


  const response = async () => {
    if (account !== ADMIN_USER || password !== ADMIN_PASSWORD) {
      return res.jsonp(MESSAGE.PASSWORD_ERROR)
    }

    await User.update({ vip_expires, vip }, { id: uid })

    return res.jsonp(MESSAGE.OK)
  }

  response()
})


module.exports = router

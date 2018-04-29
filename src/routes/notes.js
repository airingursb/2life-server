import express from 'express'

import { User, Note } from '../models'

import { MESSAGE, validate, JiGuangPush } from '../config'

const router = express.Router()

/* notes/publish */
router.post('/publish', (req, res) => {

  const {
    uid,
    token,
    timestamp,
    title,
    content,
    longitude,
    latitude,
    images
  } = req.body

  validate(
    res,
    true,
    uid,
    timestamp,
    token,
    title,
    content,
    longitude,
    latitude,
    images,
    mode)

  const response = async () => {
    const user = await User.findOne({ where: { id: uid } })
    await Note.create({
      user_id: uid,
      title,
      content,
      location: '百度地图',
      longitude,
      latitude,
      images,
      mode,
      date: Date.now(),
      status: user.status
    })
    return res.json(MESSAGE.OK)
  }

  response()
})

/* notes/delete */
router.get('/delete', (req, res) => {

  const { uid, timestamp, token, note_id } = req.query
  validate(res, true, uid, timestamp, token, note_id)

  const response = async () => {
    await Note.destroy({ where: { id: note_id } })
    return res.json(MESSAGE.OK)
  }

  response()
})

/* notes/like */
router.post('/like', (req, res) => {

  const { uid, timestamp, token, note_id } = req.body
  validate(res, true, uid, timestamp, token, note_id)

  const response = async () => {
    const user = await User.findOne({ where: { id: uid } })
    const partner = await User.findOne({ where: { id: user.user_other_id } })
    await Note.update({ is_liked: 1 }, { where: { id: note_id } })
    // 通知对方被喜欢
    JiGuangPush(user.user_other_id, '您期待的另一半已经来了:)，多写日记来记录自己的生活吧！')
    await Message.create({
      title: `${user.name} 喜欢了你的日记，真是幸福的一天`,
      type: 203,
      content: '',
      image: '',
      url: '',
      date: Date.now(),
      user_id: partner.id
    })
    await partner.increment('unread')

    return res.json(MESSAGE.OK)
  }

  response()
})

/* notes/list */
router.get('/list', (req, res) => {

  const { uid, timestamp, token } = req.query
  validate(res, true, uid, timestamp, token)

  const response = async () => {
    let user = await Note.findAll({ where: { user_id: uid } })
    let partner = []
    let recommend = {}

    const u = await User.findOne({ where: { id: uid } })

    if (u.status === 1000) {
      // 已匹配
      partner = await Note.findAll({ where: { user_id: user_other_id } })
    } else if (u.status < 200) {
      // 希望匹配异性，但是未匹配
      let recommends = []
      if (u.sex === 0) {
        recommends = await Note.findAll({
          where: {
            status: { 'gte': 110, 'lt': 120 },
            date: { 'gte': new Date().setHours(0, 0, 0, 0), 'lt': new Date().setHours(0, 0, 0, 0) + 86400000 }
          }
        })
      } else {
        recommends = await Note.findAll({
          where: {
            status: { 'gte': 100, 'lt': 110 },
            date: { 'gte': new Date().setHours(0, 0, 0, 0), 'lt': new Date().setHours(0, 0, 0, 0) + 86400000 }
          }
        })
      }
      if (recommends[0]) {
        recommend = recommends[Math.floor(Math.random() * recommends.length)]
      }
    } else if (u.status > 200 && u.status < 300) {
      // 希望匹配同姓，但是未匹配
      let recommends = []
      if (u.sex === 0) {
        recommends = await Note.findAll({
          where: {
            status: { 'gte': 200, 'lt': 210 },
            date: { 'gte': new Date().setHours(0, 0, 0, 0), 'lt': new Date().setHours(0, 0, 0, 0) + 86400000 }
          }
        })
      } else {
        recommends = await Note.findAll({
          where: {
            status: { 'gte': 210, 'lt': 220 },
            date: { 'gte': new Date().setHours(0, 0, 0, 0), 'lt': new Date().setHours(0, 0, 0, 0) + 86400000 }
          }
        })
      }
      if (recommends[0]) {
        recommend = recommends[Math.floor(Math.random() * recommends.length)]
      }
    }

    return res.json({
      ...MESSAGE.OK,
      data: { user, partner, recommend }
    })
  }

  response()
})

/* notes/show_by_time */
router.get('/show_by_time', (req, res) => {

  const { uid, timestamp, token, from_time } = req.query
  validate(res, true, uid, timestamp, token, from_time)

  const response = async () => {
    return res.json({ ...MESSAGE.OK, data })
  }

  response()
})

/* notes/sync */
router.post('/sync', (req, res) => {

  const { uid, timestamp, token, data } = req.body
  validate(res, true, uid, timestamp, token, data)

  const response = async () => {
    return res.json({ ...MESSAGE.OK, data })
  }

  response()
})

/* notes/update */
router.post('/update', (req, res) => {

  const { uid, timestamp, token, note_id, title, content, images, mode } = req.body
  validate(res, true, uid, timestamp, token, note_id, title, content, images, mode)

  const response = async () => {
    await Note.update({ title, content, images, mode }, { where: { id: note_id } })
    return res.json(MESSAGE.OK)
  }

  response()
})


module.exports = router

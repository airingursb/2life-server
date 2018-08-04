import express from 'express'
import fetch from 'node-fetch'

import { User, Note, Message } from '../models'

import {
  MESSAGE,
  validate,
  JiGuangPush,
  NLP_ID,
  NLP_SECRET
} from '../config'

import Promise from 'Promise'

import Capi from 'qcloudapi-sdk'

const capi = new Capi({
  SecretId: NLP_ID,
  SecretKey: NLP_SECRET,
  serviceType: 'wenzhi'
})

const router = express.Router()

/* notes/publish
 * 该接口弃用，仅用于兼容2.0.8以下版本（20180726）
 */
router.post('/publish', (req, res) => {

  const {
    uid,
    token,
    timestamp,
    title,
    content,
    location,
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
    location,
    longitude,
    latitude,
    images)

  const callApi = (action) => {
    return new Promise((resolve, reject) => {
      capi.request({
        Region: 'gz',
        Action: action,
        content: title + '。' + content
      }, (err, d) => {
        resolve(d)
        reject(err)
      })
    })
  }

  const response = async () => {
    const user = await User.findOne({ where: { id: uid } })
    const sens = await callApi('TextSensitivity')
    const { sensitive } = sens
    if (sensitive > 0.70) {
      return res.json(MESSAGE.REQUEST_ERROR)
    }

    const data = await callApi('TextSentiment')
    const { positive } = data

    await Note.create({
      user_id: uid,
      title,
      content,
      images,
      longitude,
      latitude,
      location,
      is_liked: 0,
      mode: req.body.mode || Math.floor(positive * 100),
      date: req.body.date || Date.now(),
      status: req.body.status || user.status
    })

    let total_notes = user.total_notes
    let total_modes = user.mode * total_notes

    await User.update({
      total_notes: total_notes + 1,
      mode: Math.floor((total_modes + Math.floor(positive * 100)) / (total_notes + 1))
    }, { where: { id: uid } })

    return res.json(MESSAGE.OK)
  }

  response()
})

/* notes/delete */
router.get('/delete', (req, res) => {

  const { uid, timestamp, token, note_id } = req.query
  validate(res, true, uid, timestamp, token, note_id)

  const response = async () => {
    const user = await User.findOne({ where: { id: uid } })
    await Note.destroy({ where: { id: note_id } })
    await user.decrement('total_notes')
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
    JiGuangPush(user.user_other_id, `${user.name} 喜欢了你的日记，真是幸福的一天`)
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

    if (u.user_other_id !== -1) {
      // 已匹配
      partner = await Note.findAll({ where: { user_id: u.user_other_id } })
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
router.get('/sync', (req, res) => {

  const { uid, timestamp, token, synctime } = req.query
  validate(res, true, uid, timestamp, token, synctime)

  const response = async () => {

    // 从七牛云上拉取json文件
    const response = await fetch(`https://airing.ursb.me/2life/file/${uid}_${synctime}.json`)
    const json = await response.json()

    // 根据操作符op同步数据库
    // 0: 未改动，1: 增加，2: 更改，3: 删除
    const diaryList = json.diaryList
    let diaryListAdd = diaryList.filter(item => {
      return item.op === 1
    })

    let diaryListUpdate = diaryList.filter(item => {
      return item.op === 2
    })

    let diaryListDelete = diaryList.filter(item => {
      return item.op === 3
    })


    if (diaryListAdd && diaryListAdd.length > 0) {
      await Note.bulkCreate(diaryListAdd)
    }

    if (diaryListUpdate && diaryListUpdate.length > 0) {
      for (let i = 0; i < diaryListUpdate.length; i++) {
        await Note.update(diaryListUpdate[i], { where: { id: diaryListUpdate[i].id } })
      }
    }

    if (diaryListDelete && diaryListDelete.length > 0) {
      for (let i = 0; i < diaryListDelete.length; i++) {
        await Note.destroy({ where: { id: diaryListDelete[i].id } })
      }
    }

    const data = await Note.findAll({ where: { user_id: uid } })

    return res.json({ ...MESSAGE.OK, data })
  }

  response()
})

/* notes/update */
router.post('/update', (req, res) => {

  const { uid, timestamp, token, note_id, title, content, images, mode } = req.body
  validate(res, true, uid, timestamp, token, note_id, title, content, images, mode)

  const response = async () => {
    const user = await User.findOne({ where: { id: uid } })
    await Note.update({ title, content, images, mode: Math.floor(mode) }, { where: { id: note_id } })

    let total_notes = user.total_notes
    let total_modes = user.mode * total_notes

    await User.update({
      mode: Math.floor((total_modes + mode) / (total_notes + 1))
    }, { where: { id: uid } })

    return res.json(MESSAGE.OK)
  }

  response()
})

module.exports = router

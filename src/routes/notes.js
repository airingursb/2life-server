import express from 'express'
import fetch from 'node-fetch'

import { User, Note, Message, Comment, Report } from '../models'

import {
  MESSAGE,
  validate,
  JiGuangPush,
  NLP_ID,
  NLP_SECRET
} from '../config'

import { wechatContentCheck, wechatImgCheck } from '../utils'

import Promise from 'Promise'

const tencentcloud = require('tencentcloud-sdk-nodejs')

const NlpClient = tencentcloud.nlp.v20190408.Client
const models = tencentcloud.nlp.v20190408.Models

const Credential = tencentcloud.common.Credential
const ClientProfile = tencentcloud.common.ClientProfile
const HttpProfile = tencentcloud.common.HttpProfile

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

  // 文档：https://cloud.tencent.com/document/product/271/35497
  const callApi = (action) => {

    return new Promise((resolve, reject) => {

      let cred = new Credential(NLP_ID, NLP_SECRET)
      let httpProfile = new HttpProfile()
      httpProfile.endpoint = 'nlp.tencentcloudapi.com'
      let clientProfile = new ClientProfile()
      clientProfile.httpProfile = httpProfile
      let client = new NlpClient(cred, 'ap-guangzhou', clientProfile)

      let params = {Text: `${title}.${content}`}
      let req

      // 内容敏感审核
      if (action === 'TextSensitivity') {
        req = new models.ContentApprovalRequest()
        req.from_json_string(JSON.stringify(params))
        client.ContentApproval(req, function (errMsg, response) {
          if (errMsg) {
            reject(errMsg)
          } else {
            resolve(response)
          }
        })
      }

      // 情感分析
      if (action === 'TextSentiment') {
        req = new models.SentimentAnalysisRequest()
        req.from_json_string(JSON.stringify(params))
        client.SentimentAnalysis(req, function (errMsg, response) {
          if (errMsg) {
            reject(errMsg)
          } else {
            resolve(response)
          }
        })
      }
    })
  }

  const response = async () => {
    const user = await User.findOne({ where: { id: uid } })

    const note = await Note.findOne({
      where: {
        user_id: uid,
        title,
        content,
        date: {
          'gte': (req.body.date || Date.now()) - 10000,
          'lte': (req.body.date || Date.now()) + 10000
        }
      }
    })

    if (note) {
      res.json({ code: 504 })
      return
    }

    const { EvilKeywords } = await callApi('TextSensitivity')

    const userAgent = req['headers']['user-agent'].toLowerCase()
    if (userAgent.match('micromessenger') !== null || userAgent.match('wechatdevtool') !== null) {
      console.log('user-agent:', userAgent)

      const msgSecCheck = await wechatContentCheck(title + '-' + content)
      const imgSecCheck = await wechatImgCheck(images)

      if (EvilKeywords || msgSecCheck.errcode !== 0 || imgSecCheck.errcode !== 0) {
        return res.json(MESSAGE.REQUEST_ERROR)
      }
    } else {
      if (EvilKeywords) {
        return res.json(MESSAGE.REQUEST_ERROR)
      }
    }

    const data = await callApi('TextSentiment')
    const { Positive } = data

    await Note.create({
      user_id: uid,
      title,
      content,
      images,
      longitude,
      latitude,
      location,
      is_liked: 0,
      mode: req.body.mode || Math.floor(Positive * 100),
      date: req.body.date || Date.now(),
      status: req.body.status || user.status
    })

    // let total_notes = user.total_notes
    // let total_modes = user.mode * total_notes
    //
    // await User.update({
    //   total_notes: total_notes + 1,
    //   mode: Math.floor((total_modes + Math.floor(positive * 100)) / (total_notes + 1))
    // }, { where: { id: uid } })

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

    const userAgent = req['headers']['user-agent'].toLowerCase()
    if (userAgent.match('micromessenger') !== null || userAgent.match('wechatdevtool') !== null) {
      console.log('user-agent:', userAgent)

      const msgSecCheck = await wechatContentCheck(title + '-' + content)
      const imgSecCheck = await wechatImgCheck(images)

      if (msgSecCheck.errcode !== 0 || imgSecCheck.errcode !== 0) {
        return res.json(MESSAGE.REQUEST_ERROR)
      }
    }

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

/* notes/refresh_total_notes */
router.get('/refresh_total_notes', (req, res) => {

  const { uid, timestamp, token } = req.query
  validate(res, true, uid, timestamp, token)

  const response = async () => {
    const c = await Note.count({ where: { user_id: uid } })

    await User.update({
      total_notes: c
    }, { where: { id: uid } })

    return res.json(MESSAGE.OK)
  }

  response()
})

/*
 * 评论功能相关接口
 *
 * 1. 查询评论：notes/show_comment
 * 2. 添加评论：notes/add_comment
 * 3. TODO: 删除评论：notes/delete_comment
 */

// 查询评论
// 注：仅显示自己与日记主人的评论，如果是主人，显示全部评论
router.get('/show_comment', (req, res) => {
  const { uid, timestamp, token, note_id, owner_id } = req.query
  validate(res, true, uid, timestamp, token, note_id, owner_id)

  const response = async () => {

    let comments = []
    if (uid === owner_id) {
      // 主人可以看到全部评论
      comments = await Comment.findAll({
        where: {
          note_id,
          delete: 0
        }, include: [
          { model: User, attributes: ['id', 'name', 'sex', 'face', 'status'], as: 'user' },
          { model: User, attributes: ['id', 'name', 'sex', 'face', 'status'], as: 'reply' }]
      })
    } else {
      // 客人只能看到自己与主人之间的评论
      comments = await Comment.findAll({
        where: {
          user_id: {
            '$in': [uid, owner_id]
          },
          reply_id: {
            '$in': [uid, owner_id]
          },
          note_id,
          delete: 0
        }, include: [
          { model: User, attributes: ['id', 'name', 'sex', 'face', 'status'], as: 'user' },
          { model: User, attributes: ['id', 'name', 'sex', 'face', 'status'], as: 'reply' }]
      })
    }

    return res.json({
      ...MESSAGE.OK,
      comments
    })
  }

  response()
})

// 添加评论
router.post('/add_comment', (req, res) => {

  // uid: 评论者 id
  // user_id: 被回复者 id，如果 user_id 等于 uid，代表评论者是公开发信息
  // owner_id: 日记主人 id
  const { uid, timestamp, token, note_id, user_id, content, owner_id } = req.body
  validate(res, true, uid, timestamp, token, note_id, user_id, content, owner_id)

  const response = async () => {

    const user = await User.findOne({ where: { id: uid } }) // 评论者

    await Comment.create({
      note_id,
      user_id: uid,
      reply_id: user_id,
      content,
      delete: 0,
      date: Date.now()
    })

    if (uid !== user_id) {
      const partner = await User.findOne({ where: { id: user_id } }) // 被评论者

      // 通知对方被回复
      JiGuangPush(user_id, `${user.name} 回复了你的评论`)
      await Message.create({
        title: `${user.name} 回复了你的评论`,
        type: 203,
        content: '',
        image: '',
        url: '',
        date: Date.now(),
        user_id
      })
      await partner.increment('unread')
    } else {
      // 公开发有两种情况:
      // 1. 主人评论，不通知
      // 2. 客人评论，通知
      // 此处处理情况2
      if (uid !== owner_id) {

        const owner = await User.findOne({ where: { id: owner_id } }) // 主人

        // 通知主人被评论
        JiGuangPush(owner_id, `${user.name} 评论了你的日记，真是幸福的一天`)
        await Message.create({
          title: `${user.name} 评论了你的日记，真是幸福的一天`,
          type: 203,
          content: '',
          image: '',
          url: '',
          date: Date.now(),
          user_id: owner_id
        })
        await owner.increment('unread')
      }
    }

    return res.json(MESSAGE.OK)
  }

  response()
})

/*
 * 树洞功能相关接口
 *
 * 1. 获取树洞列表：notes/show_holes
 * 2. 举报树洞：notes/report_hole
 * 3. TODO: 获取匿名评论：notes/show_hole_comments
 */

// 获取树洞列表
router.get('/show_holes', (req, res) => {
  const { uid, timestamp, token, version } = req.query
  validate(res, true, uid, timestamp, token, version)

  const response = async () => {

    let data = []

    if (version !== '2.2.1') {
      const { pageIndex, pageSize } = req.query
      data = await Note.findAll({
        where: {
          hole_alive: {
            'gte': Date.now()
          }
        },
        order: 'date DESC',
        offset: pageIndex * pageSize,
        limit: +pageSize,
        include: [{ model: User, attributes: ['id', 'code', 'name', 'sex', 'face', 'status', 'emotions_type'] }]
      })
    } else {
      // 2.2.1 版本未做分页处理
      data = await Note.findAll({
        where: {
          hole_alive: {
            'gte': Date.now()
          }
        },
        order: 'date DESC',
        include: [{ model: User, attributes: ['id', 'code', 'name', 'sex', 'face', 'status', 'emotions_type'] }]
      })
    }

    return res.json({
      ...MESSAGE.OK,
      data
    })
  }

  response()
})

router.get('/report_hole', (req, res) => {
  const { uid, timestamp, token, note_id } = req.query
  validate(res, true, uid, timestamp, token, note_id)

  const response = async () => {
    await Report.create({
      note_id,
      user_id: uid,
      pass: 0
    })
  }

  response()
})

module.exports = router

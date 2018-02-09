import express from 'express'
import qiniu from 'qiniu'
import {User, Message, Note} from '../models'
import * as Model from '../models/util'

import {
  QINIU_ACCESS,
  QINIU_SECRET,
  BUCKET,
  MESSAGE,
  ADMIN_USER,
  ADMIN_PASSWORD,
  validate
} from '../config/index'

const router = express.Router()
qiniu.conf.ACCESS_KEY = QINIU_ACCESS
qiniu.conf.SECRET_KEY = QINIU_SECRET

/* 获取七牛token */
router.post('/qiniu_token', (req, res) => {

  const {filename} = req.body

  validate(res, false, filename)

  const uptoken = (bucket, key) => {
    const putPolicy = new qiniu.rs.PutPolicy(bucket + ':' + key)
    return putPolicy.token()
  }

  const qiniu_token = uptoken(BUCKET, filename)

  return res.json({...MESSAGE.OK, qiniu_token})
})

/* 后台发送通知 */
router.post('/push_message', (req, res) => {

  const {user, password, type, title, content, image, url} = req.body

  validate(res, false, user, password, type, title, content, image, url)

  if (user !== ADMIN_USER && password !== ADMIN_PASSWORD)
    return res.json(MESSAGE.ADMIN_ERROR)

  const message = {
    message_title: title,
    message_content: content,
    message_date: Date.now(),
    message_type: type,
    message_image: image,
    message_url: url
  }

  const response = async () => {
    await Model.create(Message, message)
    await Model.update(User, {user_message: 1}, {})
    return res.json(MESSAGE.OK)
  }

  response()
})

/* 后台获取日记 */
router.post('/get_all_note', (req, res) => {

  const {admin, password} = req.body

  validate(res, false, admin, password)

  const response = async () => {
    const notes = await Model.findAll(Note, {}, [User])
    if (admin === ADMIN_USER && password === ADMIN_PASSWORD) {
      const data = await notes.map(note => {
        note.dataValues.note_title = note.dataValues.note_date < 1497780516378
          ? note.dataValues.note_title
          : new Buffer(note.dataValues.note_title, 'base64').toString()
        note.dataValues.note_content = note.dataValues.note_date < 1497780516378
          ? note.dataValues.note_content
          : new Buffer(note.dataValues.note_content, 'base64').toString()
        return {...note.dataValues}
      })
      return res.json({...MESSAGE.OK, data})
    }
  }

  response()
})

module.exports = router

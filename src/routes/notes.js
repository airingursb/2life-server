import express from 'express'

import {User, Note} from '../models'
import * as Model from '../models/util'

import {MESSAGE, checkToken} from '../config'

const router = express.Router()

/* notes/save */
router.post('/save', (req, res) => {

  const {
    uid,
    token,
    timestamp,
    note_title,
    note_content,
    note_date,
    note_location,
    note_longitude,
    note_latitude,
    note_images
  } = req.body

  if (typeof uid === 'undefined' || uid === null
    || typeof token === 'undefined' || token === null
    || typeof timestamp === 'undefined' || timestamp === null
    || typeof note_title === 'undefined' || note_title === null
    || typeof note_content === 'undefined' || note_content === null
    || typeof note_date === 'undefined' || note_date === null
    || typeof note_location === 'undefined' || note_location === null
    || typeof note_longitude === 'undefined' || note_longitude === null
    || typeof note_latitude === 'undefined' || note_latitude === null
    || typeof note_images === 'undefined' || note_images === null) {
    return res.json({code: 400, msg: MESSAGE.PARAMETER_ERROR})
  }

  if (!checkToken(uid, timestamp, token))
    return res.json({code: 500, msg: MESSAGE.TOKEN_ERROR})

  const note = {
    note_title: new Buffer(note_title).toString('base64'),
    note_content: new Buffer(note_content).toString('base64'),
    note_date: note_date,
    note_location: note_location,
    note_longitude: note_longitude,
    note_latitude: note_latitude,
    note_images: note_images
  }

  const response = async () => {
    const user = await Model.findOne(User, {id: uid})
    await user.createNote(note)
    return res.json({code: 0, msg: MESSAGE.SUCCESS})
  }

  response()
})

/* notes/delete */
router.post('/delete', (req, res) => {

  const {uid, timestamp, token, note_id} = req.body

  if (typeof uid === 'undefined' || uid === null
    || typeof token === 'undefined' || token === null
    || typeof timestamp === 'undefined' || timestamp === null
    || typeof note_id === 'undefined' || note_id === null) {
    return res.json({code: 400, msg: MESSAGE.PARAMETER_ERROR})
  }

  if (!checkToken(uid, timestamp, token))
    return res.json({code: 500, msg: MESSAGE.TOKEN_ERROR})

  const response = async () => {
    await Model.remove(Note, {id: note_id})
    return res.json({code: 0, msg: MESSAGE.SUCCESS})
  }

  response()
})

/* notes/show */
router.post('/show', (req, res) => {

  const {uid, timestamp, token, user_id, sex} = req.body

  if (typeof uid === 'undefined' || uid === null
    || typeof token === 'undefined' || token === null
    || typeof timestamp === 'undefined' || timestamp === null
    || typeof user_id === 'undefined' || user_id === null
    || typeof sex === 'undefined' || sex === null) {
    return res.json({code: 400, msg: MESSAGE.PARAMETER_ERROR})
  }

  if (!checkToken(uid, timestamp, token))
    return res.json({code: 500, msg: MESSAGE.TOKEN_ERROR})

  let condition = {userId: uid}

  if (user_id !== -1) {
    condition = {userId: [uid, user_id]}
  }

  const my_sex = sex === 0 ? 'male' : 'female'
  const partner_sex = sex === 0 ? 'female' : 'male'

  const response = async () => {
    const notes = await Model.findAll(Note, condition, User)

    const data = await notes.map(note => {
      note.dataValues.note_id = note.dataValues.id
      note.dataValues.note_title = note.dataValues.note_date < 1497780516378
        ? note.dataValues.note_title
        : new Buffer(note.dataValues.note_title, 'base64').toString()
      note.dataValues.note_content = note.dataValues.note_date < 1497780516378
        ? note.dataValues.note_content
        : new Buffer(note.dataValues.note_content, 'base64').toString()
      note.dataValues.user.id === uid
        ? note.dataValues.male = my_sex
        : note.dataValues.male = partner_sex
      note.dataValues.user.id === uid
        ? note.dataValues.me = 'yes'
        : note.dataValues.me = 'no'
      return {...note.dataValues}
    })

    return res.json({code: 0, msg: MESSAGE.SUCCESS}, data)
  }

  response()
})

module.exports = router

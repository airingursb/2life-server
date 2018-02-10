import express from 'express'

import { User, Note } from '../models'
import * as Model from '../models/util'

import { MESSAGE, validate } from '../config'

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

  validate(
    res,
    true,
    uid,
    timestamp,
    token,
    note_title,
    note_content,
    note_date,
    note_location,
    note_longitude,
    note_latitude,
    note_images)

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
    return res.json(MESSAGE.OK)
  }

  response()
})

/* notes/delete */
router.post('/delete', (req, res) => {

  const {uid, timestamp, token, note_id} = req.body

  validate(res, true, uid, timestamp, token, note_id)

  const response = async () => {
    await Model.remove(Note, {id: note_id})
    return res.json(MESSAGE.OK)
  }

  response()
})

/* notes/show */
router.post('/show', (req, res) => {

  const {uid, timestamp, token, user_id, sex} = req.body

  validate(res, true, uid, timestamp, token, user_id, sex)

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

    return res.json({...MESSAGE.OK, data})
  }

  response()
})

module.exports = router

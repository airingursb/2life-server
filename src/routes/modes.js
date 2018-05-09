import express from 'express'

import { Note } from '../models'

import {
  MESSAGE,
  validate
} from '../config'

const router = express.Router()

router.get('/show', (req, res) => {

  const { uid, token, timestamp } = req.query
  validate(res, true, uid, timestamp, token)

  const response = async () => {
    const notes = await Note.findAll({ where: { user_id: uid } })

    const data = await notes.map(n => {
      const d = {}
      d[n.dataValues.date] = n.dataValues.mode
      return d
    })
    return res.json({ ...MESSAGE.OK, data })
  }
  response()
})

module.exports = router

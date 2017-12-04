import http from 'http'

import express from 'express'
import bodyParser from 'body-parser'
import index from './routes/index'
import users from './routes/users'
import notes from './routes/notes'
import util from './routes/util'

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))

app.use('/', index)
app.use('/users', users)
app.use('/notes', notes)
app.use('/util', util)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handler
app.use(function (err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

const server = http.createServer(app)
server.listen('3002')

module.exports = app

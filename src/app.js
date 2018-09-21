import http from 'http'

import express from 'express'
import bodyParser from 'body-parser'
import index from './routes/index'
import users from './routes/users'
import notes from './routes/notes'
import modes from './routes/modes'
import util from './routes/util'
import admin from './routes/admin'

import log4js from 'log4js'

const app = express()

log4js.configure({
  appenders: {
    console: { type: 'console' },
    file: { type: 'file', filename: 'logs/log4jsconnect.log' }
  },
  categories: {
    default: { appenders: ['console'], level: 'info' },
    log4jslog: { appenders: ['file'], level: 'info' }
  }
})

const logger = log4js.getLogger('log4jslog')

app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'X-Requested-With')
  res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS')
  res.header('X-Powered-By', '3.2.1')
  res.header('Content-Type', 'application/json;charset=utf-8')
  next()
})

app.use(log4js.connectLogger(logger, { level: 'auto' }))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use('/', index)
app.use('/users', users)
app.use('/notes', notes)
app.use('/modes', modes)
app.use('/utils', util)
app.use('/admin', admin)

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handler
app.use((err, req, res) => {
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

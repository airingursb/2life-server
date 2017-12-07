const db = require('../config/sequelize').dbConnect()

const User = db.import('./user')
const Note = db.import('./note')
const Feedback = db.import('./feedback')
const Code = db.import('./code')
const Message = db.import('./message')

User.hasMany(Note, {foreignKey: 'userId', targetKey: 'userId'})
User.hasMany(Feedback, {foreignKey: 'userId', targetKey: 'userId'})

Note.belongsTo(User)
Feedback.belongsTo(User)

db.sync()

module.exports = {
  User,
  Note,
  Feedback,
  Code,
  Message
}

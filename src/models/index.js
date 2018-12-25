const db = require('../config/sequelize').dbConnect()

const User = db.import('./user')
const Note = db.import('./note')
const Badge = db.import('./badge')
const Award = db.import('./award')
const Feedback = db.import('./feedback')
const Code = db.import('./code')
const Message = db.import('./message')
const Token = db.import('./token')
const Activity = db.import('./activity')
const Version = db.import('./version')

User.hasMany(Note, { foreignKey: 'user_id' })
User.hasMany(Feedback, { foreignKey: 'user_id' })

Award.hasOne(Badge, { foreignKey: 'badge_id' })
User.hasOne(Badge, { foreignKey: 'badge_id' })

Note.belongsTo(User)
Feedback.belongsTo(User)
Badge.belongsTo(Award)
Badge.belongsTo(User)

db.sync()

module.exports = {
  User,
  Note,
  Badge,
  Award,
  Feedback,
  Code,
  Message,
  Token,
  Activity,
  Version
}

module.exports = (sequelize, DataTypes) => {

  const { TEXT, INTEGER, STRING } = DataTypes

  return sequelize.define('feedback', {
    'user_id': INTEGER,
    'title': STRING(135),
    'content': TEXT,
    'type': INTEGER
  })
}

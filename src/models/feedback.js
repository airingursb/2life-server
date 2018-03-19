module.exports = (sequelize, DataTypes) => {
  
  const { TEXT, DOUBLE, INTEGER, STRING } = DataTypes

  return sequelize.define('feedback', {
    'user_id': INTEGER,
    'contact': STRING(135),
    'content': TEXT,
  })
}

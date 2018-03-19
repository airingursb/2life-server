module.exports = (sequelize, DataTypes) => {

  const { TEXT, DOUBLE, STRING, INTEGER } = DataTypes

  return sequelize.define('message', {
    'message_date': DOUBLE
    'message_title': TEXT
    'message_type': INTEGER
    'message_content': TEXT
    'message_image': STRING(125),
    'message_url': TEXT
  })
}

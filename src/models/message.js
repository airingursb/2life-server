module.exports = (sequelize, DataTypes) => {

  const { DOUBLE, STRING, INTEGER } = DataTypes

  return sequelize.define('message', {
    'title': STRING(125),
    'type': INTEGER,
    'content': STRING(500),
    'image': STRING(125),
    'url': STRING(125),
    'date': DOUBLE,
    'user_id': INTEGER
  })
}

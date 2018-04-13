module.exports = (sequelize, DataTypes) => {

  const { TEXT, DOUBLE, STRING, INTEGER } = DataTypes

  return sequelize.define('message', {
    'date': DOUBLE,
    'title': TEXT,
    'type': INTEGER,
    'content': TEXT,
    'image': STRING(125),
    'url': TEXT,
  })
}

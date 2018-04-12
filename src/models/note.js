module.exports = (sequelize, DataTypes) => {

  const { TEXT, DOUBLE, INTEGER, STRING } = DataTypes
  
  return sequelize.define('note', {
    'user_id': INTEGER,
    'title': TEXT,
    'content': TEXT,
    'images': TEXT,
    'latitude': DOUBLE,
    'longitude': DOUBLE,
    'location': STRING(245),
    'is_liked': INTEGER,
    'mode': DOUBLE,
  })
}

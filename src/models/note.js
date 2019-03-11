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
    'date': DOUBLE,
    'status': INTEGER,
    'uuid': STRING(100),
    'hole_alive': DOUBLE, // 树洞下线时间：-1 为不发布到树洞。
    'v': INTEGER
  })
}

module.exports = (sequelize, DataTypes) => {

  const { STRING, INTEGER, DOUBLE, TEXT } = DataTypes

  return sequelize.define('user', {
    'code': STRING(45),
    'account': STRING(45),
    'password': STRING(45),
    'name': STRING(45),
    'sex': INTEGER,
    'face': STRING(250),
    'status': INTEGER,
    'total_notes': INTEGER,
    'mode': DOUBLE,
    'last_times': INTEGER,
    'total_times': INTEGER,
    'badges': STRING(500),
    'badge_id': INTEGER,
    'rate': DOUBLE,
    'connect_at': DOUBLE,
    'openid': STRING(45),
    'user_other_id': INTEGER,
    'ban_id': TEXT,
    'unread': INTEGER,
    'latitude': DOUBLE,
    'longitude': DOUBLE,
    'emotions_basis': STRING(200),
    'emotions': STRING(200),
    'emotions_type': STRING(45),
    'emotions_report': TEXT,
    'vip': INTEGER,
    'vip_expires': DOUBLE
  })
}

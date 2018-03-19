module.exports = (sequelize, DataTypes) => {

  const { STRING, INTEGER } = DataTypes

  return sequelize.define('user', {
    'user_account': STRING(45),
    'user_password': STRING(45),
    'user_name': STRING(45),
    'user_face': STRING(125),
    'user_sex': INTEGER,
    'user_other_id': INTEGER,
    'user_last_connect': INTEGER,
    'user_connect_times': INTEGER,
    'user_code': STRING(45),
    'user_message': INTEGER
  })
}

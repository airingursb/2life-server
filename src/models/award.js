module.exports = (sequelize, DataTypes) => {

  const { BOOLEAN, INTEGER, STRING } = DataTypes
  
  return sequelize.define('award', {
    'code': STRING(45),
    'badge_id': INTEGER,
    'used': BOOLEAN,
  })
}

module.exports = (sequelize, DataTypes) => {

  const { STRING, BOOLEAN, DOUBLE } = DataTypes

  return sequelize.define('token', {
    'code': STRING(100),
    'deadline': DOUBLE,
    'alive': BOOLEAN
  })
}

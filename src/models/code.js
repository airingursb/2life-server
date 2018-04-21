module.exports = (sequelize, DataTypes) => {

  const { STRING, BOOLEAN, DOUBLE } = DataTypes

  return sequelize.define('code', {
    'account': STRING(20),
    'timestamp': DOUBLE,
    'used': BOOLEAN,
    'code': STRING(20),
  })
}

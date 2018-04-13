module.exports = (sequelize, DataTypes) => {

  const { STRING } = DataTypes

  return sequelize.define('badge', {
    'name': STRING(45),
    'image': STRING(45),
    'bio': STRING(125),
  })
}

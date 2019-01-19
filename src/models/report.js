module.exports = (sequelize, DataTypes) => {

  const {
    INTEGER
  } = DataTypes

  return sequelize.define('report', {
    'note_id': INTEGER,
    'user_id': INTEGER, // 举报者 id
    'pass': INTEGER, // 处理结果: 0 未处理，1 通过，2 不通过
  })
}

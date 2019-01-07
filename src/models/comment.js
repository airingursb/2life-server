module.exports = (sequelize, DataTypes) => {

  const {
    TEXT,
    INTEGER,
    DOUBLE
  } = DataTypes

  return sequelize.define('comment', {
    'user_id': INTEGER,
    'reply_id': INTEGER,
    'note_id': INTEGER,
    'content': TEXT,
    'date': DOUBLE,
    'delete': INTEGER, // 是否删除，0 未删除，1 已删除
  })
}

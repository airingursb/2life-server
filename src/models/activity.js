module.exports = (sequelize, DataTypes) => {

  const { INTEGER, DOUBLE, BOOLEAN } = DataTypes

  return sequelize.define('act_1', {
    'user_id': INTEGER, // 报名用户id
    'user_other_id': INTEGER, // 另一半用户id
    'state': INTEGER, // 用户报名时的状态，用于匹配
    'success': BOOLEAN, // 是否报名成功
    'process': DOUBLE, // 活动完成度
    'gold': DOUBLE, // 活动目标
    'finished': BOOLEAN, // 活动是否完成
    'beginline': DOUBLE, // 活动开始时间的时间戳
    'deadline': DOUBLE, // 活动截止时间的时间戳
  })
}

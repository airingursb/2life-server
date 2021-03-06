module.exports = (sequelize, DataTypes) => {

  const {
    STRING,
    INTEGER,
  } = DataTypes

  return sequelize.define('version', {
    'version': STRING(100),
    'platform': INTEGER, // 平台码：1-ios, 2-Android, 3-wxapp
    'status': INTEGER, // 状态码：0-当前最新版，1-稳定版（兼容）, 2-beta, 3-废弃（不兼容）
  })
}

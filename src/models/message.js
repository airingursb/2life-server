/**
 * Created by airing on 2017/6/11.
 */
module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    'message',
    {
      'message_date': {
        'type': DataTypes.DOUBLE,
        'allowNull': false
      },
      'message_title': {
        'type': DataTypes.TEXT,
        'allowNull': true
      },
      'message_type': {
        'type': DataTypes.INTEGER,
        'allowNull': true
      },
      'message_content': {
        'type': DataTypes.TEXT,
        'allowNull': true
      },
      'message_image': {
        'type': DataTypes.STRING(125),
        'allowNull': true
      },
      'message_url': {
        'type': DataTypes.TEXT,
        'allowNull': true
      }
    }
  );
}

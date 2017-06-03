/**
 * Created by airing on 2017/4/25.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        'feedback',
        {
            'userId': {
                'type': DataTypes.INTEGER,
                'allowNull': false
            },
            'contact': {
                'type': DataTypes.STRING(135),
                'allowNull': true
            },
            'content': {
                'type': DataTypes.TEXT,
                'allowNull': false
            }
        },
        {
            indexes: [
                {
                    name: 'user_id',
                    method: 'BTREE',
                    fields: ['userId']
                }
            ]
        }
    );
}

/**
 * Created by airing on 2017/4/14.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        'note',
        {
            'userId': {
                'type': DataTypes.INTEGER,
                'allowNull': false
            },
            'note_date': {
                'type': DataTypes.DOUBLE,
                'allowNull': false
            },
            'note_title': {
                'type': DataTypes.TEXT,
                'allowNull': true
            },
            'note_content': {
                'type': DataTypes.TEXT,
                'allowNull': true
            },
            'note_images': {
                'type': DataTypes.TEXT,
                'allowNull': true
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

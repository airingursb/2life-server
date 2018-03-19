module.exports = (sequelize, DataTypes) => {

  const { TEXT, DOUBLE, INTEGER, STRING } = DataTypes
  
  return sequelize.define('note', {
    'user_id': INTEGER,
    'note_date': DOUBLE,
    'note_title': TEXT,
    'note_content': TEXT,
    'note_images': TEXT,
    'note_latitude': DOUBLE,
    'note_longitude': DOUBLE,
    'note_location': STRING(245),
  })
}

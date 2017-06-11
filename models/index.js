var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize').sequelize();
var User = sequelize.import('./user');
var Note = sequelize.import('./note');
var Feedback = sequelize.import('./feedback');
var Code = sequelize.import('./code');
var Message = sequelize.import('./message');

User.hasMany(Note, {foreignKey: 'userId', targetKey: 'userId'});
User.hasMany(Feedback, {foreignKey: 'userId', targetKey: 'userId'});

Note.belongsTo(User);
Feedback.belongsTo(User);

sequelize.sync();

exports.User = User;
exports.Note = Note;
exports.Feedback = Feedback;
exports.Code = Code;
exports.Message = Message;

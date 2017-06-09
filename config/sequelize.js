/**
 * Created by airing on 2017/4/10.
 */
var Sequelize = require('sequelize');
var SQL_PASSWORD = require('../routes/config').SQL_PASSWORD;

exports.sequelize = function () {
	return new Sequelize('twolife', 'root', SQL_PASSWORD, {'dialect': 'mysql',host: 'localhost', port:3306});
}

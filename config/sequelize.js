/**
 * Created by airing on 2017/4/10.
 */
var Sequelize = require('sequelize');

exports.sequelize = function () {
	return new Sequelize('twolife', 'root', '', {'dialect': 'mysql',host: 'localhost', port:3306});
}

var express = require('express');
var router = express.Router();
var UserModel = require('../models').User;
var NoteModel = require('../models').Note;
var sha1 = require('sha1');
var md5 = require('md5');
var MESSAGE = require('./config').MESSAGE;
var KEY = require('./config').KEY;

/* notes/save */
router.post('/save', function (req, res, next) {

    var timestamp = new Date().getTime();

    if (req.body.user_account == undefined || req.body.user_account == ''
        || req.body.user_password == undefined || req.body.user_password == '') {
        res.json({status: 1, msg: MESSAGE.PARAMETER_ERROR});
        return;
    }

    log('notes/save');

    var user = {
        user_account: req.body.user_account,
        user_password: sha1(req.body.user_password)
    };
    UserModel.findOne({
        where: {
            user_account: user.user_account
        }
    }).then(function (user) {
        if (!user) {
            return res.json({status: 1002, msg: MESSAGE.USER_NOT_EXIST});
        }
        if (user.user_password !== req.body.user_password) {
            return res.json({status: 1003, msg: MESSAGE.PASSWORD_ERROR});
        }
        var token = md5(user.id + timestamp + KEY);
        var userData = {
            uid: user.id,
            user_name: user.user_name,
            user_sex: user.user_sex,
            token: token,
            created_at: user.createdAt,
            updated_at: timestamp,
            timestamp: timestamp
        };
        res.json({status: 0, data: userData, msg: MESSAGE.SUCCESS});
    });
});

module.exports = router;

var express = require('express');
var router = express.Router();
var UserModel = require('../models').User;
var NoteModel = require('../models').Note;
var CodeModel = require('../models').Code;
var FeedbackModel  = require('../models').Feedback;
var sha1 = require('sha1');
var md5 = require('md5');
var MESSAGE = require('./config').MESSAGE;
var KEY = require('./config').KEY;
var log = require('./config').log;
var https = require('https');
var querystring = require('querystring');

/* users/code */
router.post('/code', function (req, res, next) {

    var timestamp = new Date().getTime();
    if (req.body.user_account == undefined || req.body.user_account == ''
        || req.body.timestamp == undefined || req.body.timestamp == '') {
        res.json({status: 1000, msg: MESSAGE.PARAMETER_ERROR});
        return;
    }

    log('users/code');

    var code = Math.floor(Math.random() * 8999 + 1000)

    var postData = {
        mobile: req.body.user_account,
        text:'【骑阅APP】您的验证码是' +  code,
        apikey: ''  // 填写自己的云片API
    };

    var content = querystring.stringify(postData);

    var options = {
        host: 'sms.yunpian.com',
        path: '/v2/sms/single_send.json',
        method: 'POST',
        agent: false,
        rejectUnauthorized: false,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': content.length
        }
    };

    var req = https.request(options,function(res){
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log(JSON.parse(chunk));
        });
        res.on('end',function(){
            console.log('over');
        });
    });
    req.write(content);
    req.end();

    var model = {
        user_account: req.body.user_account
        code: code,
        timestamp: timestamp,
        used: false
    }

    CodeModel.create(model).then(function() {
        return res.json({status: 0, msg: MESSAGE.SUCCESS});
    }).catch(next);
})

/* users/register */
router.post('/register', function (req, res, next) {

    var timestamp = new Date().getTime();

    if (req.body.user_account == undefined || req.body.user_account == ''
        || req.body.user_password == undefined || req.body.user_password == ''
        || req.body.user_name == undefined || req.body.user_name == ''
        || req.body.user_sex == undefined || req.body.user_sex == ''
        || req.body.code == undefined || req.body.code == ''
        || req.body.timestamp == undefined || req.body.timestamp == '') {
        res.json({status: 1000, msg: MESSAGE.PARAMETER_ERROR});
        return;
    }

    log('users/register');

    CodeModel.findOne({
        where: {
            user_account: req.body.user_account,
            code: req.body.code,
            used: false,
            timestamp: req.body.timestamp
        }
    }).then(function() {
        var user = {
            user_account: req.body.user_account,
            user_password: md5(req.body.user_password),
            user_sex: req.body.user_sex,
            user_name: req.body.user_name
        }
        UserModel.create(user).then(function() {
            return res.json({status: 0, data: user, msg: MESSAGE.SUCCESS});
        }).catch(next);
    }).catch(next);

    return res.json({status: 1003, msg: MESSAGE.CODE_ERROR});
});

/* users/login */
router.post('/login', function (req, res, next) {

    var timestamp = new Date().getTime();

    if (req.body.user_account == undefined || req.body.user_account == ''
        || req.body.user_password == undefined || req.body.user_password == '') {
        res.json({status: 1000, msg: MESSAGE.PARAMETER_ERROR});
        return;
    }

    log('users/login');

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

/* users/feedback */
router.post('/feedback', function (req, res, next) {

    var timestamp = new Date().getTime();

    if (req.body.uid == undefined || req.body.uid == ''
        || req.body.timestamp == undefined || req.body.timestamp == ''
        || req.body.token == undefined || req.body.token == ''
        || req.body.contact == undefined || req.body.contact == ''
        || req.body.content == undefined || req.body.content == '') {
        res.json({status: 1000, msg: MESSAGE.PARAMETER_ERROR});
        return;
    }

    log('users/feedback');

    var feedback = {
        contact: req.body.contact,
        content: req.body.content
    };
    UserModel.findOne({
        where: {
            id: req.body.uid
        }
    }).then(function (user) {
        if (!user) {
            return res.json({status: 1001, msg: MESSAGE.USER_NOT_EXIST});
        }
        user.createFeedback(feedback);
        res.json({status: 0, msg: MESSAGE.SUCCESS});
    }).catch(next);;
});

module.exports = router;

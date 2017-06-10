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
var YUNPIAN_APIKEY = require('./config').YUNPIAN_APIKEY;
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
        text:'【双生APP】您的验证码是' +  code,
        apikey: YUNPIAN_APIKEY 
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

    var model = {
        user_account: req.body.user_account,
        code: code,
        timestamp: timestamp,
        used: false
    }

    CodeModel.findAll({
        where: {
            user_account: req.body.user_account,
            used: false
        }
    }).then(function(results) {
        if (results[0] !== undefined) {
            console.log('连续请求:' + (timestamp - results[0].timestamp));
            if(timestamp - results[0].timestamp < 600000) {
                res.json({status: 5000, msg: MESSAGE.REQUEST_ERROR});
                return;
            }
        }
        CodeModel.create(model).then(function() {
            return res.json({status: 0, msg: MESSAGE.SUCCESS});
        }).catch(next);

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
    })
    
})

/* users/register */
router.post('/register', function (req, res, next) {

    var timestamp = new Date().getTime();

    if (req.body.user_account == undefined || req.body.user_account == ''
        || req.body.user_password == undefined || req.body.user_password == ''
        || req.body.user_name == undefined || req.body.user_name == ''
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
    }).then(function(result) {
        if(!result){
            UserModel.findOne({
                where: {
                    user_account: req.body.user_account
                }
            }).then(function(result) {
                if(!result) {
                    var user = {
                        user_account: req.body.user_account,
                        user_password: md5(req.body.user_password),
                        user_sex: 0,
                        user_name: req.body.user_name,
                        user_other_id: -1,
                        user_code: '0' + Math.floor((Math.random()*89999 + 10000))
                    }
                    UserModel.create(user).then(function() {
                        return res.json({status: 0, data: user, msg: MESSAGE.SUCCESS});
                    }).catch(next);
                } else {
                    return res.json({status: 1004, msg: MESSAGE.USER_ALREADY_EXIST});
                }
            })
        } else {
            return res.json({status: 1003, msg: MESSAGE.CODE_ERROR});
        }
    });
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
        user_password: md5(req.body.user_password)
    };
    UserModel.findOne({
        where: {
            user_account: user.user_account
        }
    }).then(function (user) {
        if (!user) {
            return res.json({status: 1002, msg: MESSAGE.USER_NOT_EXIST});
        }
        if (user.user_password !== md5(req.body.user_password)) {
            return res.json({status: 1003, msg: MESSAGE.PASSWORD_ERROR});
        }
        var token = md5((user.id).toString() + timestamp.toString() + KEY);
        var userData = {
            uid: user.id,
            user_name: user.user_name,
            user_sex: user.user_sex,
            token: token,
            user_other_id: user.user_other_id,
            created_at: user.createdAt,
            updated_at: timestamp,
            timestamp: timestamp,
            user_code: user.user_code
        };
        res.json({status: 0, data: userData, msg: MESSAGE.SUCCESS});
    });
});

/* users/check */
router.post('/check', function (req, res, next) {

    var timestamp = new Date().getTime();

    if (req.body.uid == undefined || req.body.uid == ''
        || req.body.timestamp == undefined || req.body.timestamp == ''
        || req.body.token == undefined || req.body.token == '') {
        res.json({status: 1000, msg: MESSAGE.PARAMETER_ERROR});
        return;
    }
    console.log('left:' + md5(req.body.uid + req.body.timestamp + KEY))
    console.log('right:' + req.body.token)
    if (md5(req.body.uid + req.body.timestamp + KEY) == req.body.token) {
        res.json({status: 0, msg: MESSAGE.SUCCESS});
        return;
    } else {
        res.json({status: 4000, msg: MESSAGE.USER_NOT_LOGIN});
        return;
    }
});

/* users/user */
router.post('/user', function (req, res, next) {

    var timestamp = new Date().getTime();

    if (req.body.user_id == undefined || req.body.user_id == '') {
        res.json({status: 1000, msg: MESSAGE.PARAMETER_ERROR});
        return;
    }

    log('users/user');
    UserModel.findOne({
        where: {
            id: req.body.user_id
        }
    }).then(function (user) {
        if (!user) {
            res.json({status: 1002, msg: MESSAGE.USER_NOT_EXIST});
            return;
        }
        var userData = {
            uid: user.id,
            user_name: user.user_name,
            user_sex: user.user_sex,
            user_id: user.user_other_id,
            created_at: user.createdAt,
            user_code: user.user_code
        };
        res.json({status: 0, data: userData, msg: MESSAGE.SUCCESS});
    }).catch(next);
});

/* users/update */
router.post('/update', function (req, res, next) {

    var timestamp = new Date().getTime();

    if (req.body.uid == undefined || req.body.uid == ''
        || req.body.timestamp == undefined || req.body.timestamp == ''
        || req.body.token == undefined || req.body.token == ''
        || req.body.user_sex == undefined || req.body.user_sex == ''
        || req.body.user_name == undefined || req.body.user_name == '') {
        res.json({status: 1000, msg: MESSAGE.PARAMETER_ERROR});
        return;
    }

    log('users/update');

    UserModel.update({
        user_name: req.body.user_name,
        user_sex: req.body.user_sex
    }, {
        where: {
            id: req.body.uid
        }
    }).then(function() {
        UserModel.findOne({
            where: {
                id: req.body.uid
            }
        }).then(function(user) {
            var userData = {
                uid: user.id,
                user_name: user.user_name,
                user_sex: user.user_sex,
                token: req.body.token,
                user_other_id: user.user_other_id,
                created_at: user.createdAt,
                updated_at: timestamp,
                timestamp: req.body.timestamp,
                user_code: user.user_code
            };
            res.json({status: 0, data: userData, msg: MESSAGE.SUCCESS});
            return;
        })
    }).catch(next);
});

/* users/close_connect */
router.post('/close_connect', function (req, res, next) {

    var timestamp = new Date().getTime();

    if (req.body.uid == undefined || req.body.uid == ''
        || req.body.timestamp == undefined || req.body.timestamp == ''
        || req.body.token == undefined || req.body.token == ''
        || req.body.user_other_id == undefined || req.body.user_other_id == '') {
        res.json({status: 1000, msg: MESSAGE.PARAMETER_ERROR});
        return;
    }

    log('users/close_connect');

    UserModel.update({
        user_other_id: -404,
    }, {
        where: {
            id: req.body.uid
        }
    }).then(function(user) {
        if (req.body.user_other_id !== -1) {
            UserModel.update({
                user_other_id: -1,
            }, {
                where: {
                    id: req.body.user_other_id
                }
            }).then(function(user) {
                res.json({status: 0, msg: MESSAGE.SUCCESS});
                return;
            })
        } else {
            res.json({status: 0, msg: MESSAGE.SUCCESS});
            return;
        }
    }).catch(next);
});


/* users/connect */
router.post('/connect', function (req, res, next) {

    var timestamp = new Date().getTime();

    if (req.body.uid == undefined || req.body.uid == ''
        || req.body.timestamp == undefined || req.body.timestamp == ''
        || req.body.token == undefined || req.body.token == ''
        || req.body.sex == undefined || req.body.sex == '') {
        res.json({status: 1000, msg: MESSAGE.PARAMETER_ERROR});
        return;
    }

    log('users/connect');

    UserModel.findAll({
        where: {
            user_sex: req.body.sex == 0 ? 1: 0,
            user_other_id: -1
        }
    }).then(function(users) {
        if (!users[0]) {
            return res.json({status: 1001, msg: MESSAGE.USER_NOT_EXIST});
        }
        var user = users[Math.floor(Math.random()*users.length)]
        UserModel.update({
            user_other_id: user.id
        },{
            where: {
                id: req.body.uid
            }
        }).then(function() {
            UserModel.update({
                user_other_id: req.body.uid
            },{
                where: {
                    id: user.id
                }
            }).then(function() {
                var userData = {
                    uid: user.id,
                    user_name: user.user_name,
                    user_sex: user.user_sex,
                    user_id: user.user_other_id,
                    created_at: user.createdAt,
                    user_code: user.user_code
                };
                return res.json({status: 0, data: userData, msg: MESSAGE.SUCCESS});
            })
        })
    }).catch(next);
});

/* users/connect_by_id */
router.post('/connect_by_id', function (req, res, next) {

    var timestamp = new Date().getTime();

    if (req.body.uid == undefined || req.body.uid == ''
        || req.body.timestamp == undefined || req.body.timestamp == ''
        || req.body.token == undefined || req.body.token == ''
        || req.body.sex == undefined || req.body.sex == ''
        || req.body.code == undefined || req.body.code == '') {
        res.json({status: 1000, msg: MESSAGE.PARAMETER_ERROR});
        return;
    }

    log('users/connect_by_id');

    UserModel.findAll({
        where: {
            user_code: req.body.code,
            user_sex: req.body.sex == 0? 1: 0,
            user_other_id: -1
        }
    }).then(function(users) {
        console.log(users[0] == null)
        if (!users[0]) {
            res.json({status: 1001, msg: MESSAGE.USER_NOT_EXIST});
            return;
        }
        var user = users[0];
        UserModel.update({
            user_other_id: user.id
        },{
            where: {
               id: req.body.uid, 
            }
        }).then(function(result) {
            UserModel.update({
                user_other_id: req.body.uid
            },{
                where: {
                    id: user.id
                }
            }).then(function() {
                var userData = {
                    uid: user.id,
                    user_name: user.user_name,
                    user_sex: user.user_sex,
                    user_id: user.user_other_id,
                    created_at: user.createdAt,
                    user_code: user.user_code
                };
                res.json({status: 0, data: userData, msg: MESSAGE.SUCCESS});
                return;
            });    
        });
    }).catch(next);
    return;
});

/* users/disconnect */
router.post('/disconnect', function (req, res, next) {

    var timestamp = new Date().getTime();

    if (req.body.uid == undefined || req.body.uid == ''
        || req.body.timestamp == undefined || req.body.timestamp == ''
        || req.body.token == undefined || req.body.token == ''
        || req.body.user_id == undefined || req.body.user_id == '') {
        res.json({status: 1000, msg: MESSAGE.PARAMETER_ERROR});
        return;
    }

    log('users/disconnect');

    UserModel.update({
        user_other_id: -1
    },{
        where: {
            id: [req.body.uid, req.body.user_id]
        }
    }).then(function(result) {
        return res.json({status: 0, msg: MESSAGE.SUCCESS});
    }).catch(next);

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
    }).catch(next);
});

/* users/answer_feedback */
router.post('/answer_feedback', function (req, res, next) {

    var timestamp = new Date().getTime();

    if (req.body.contact == undefined || req.body.contact == ''
        || req.body.content == undefined || req.body.content == '') {
        res.json({status: 1000, msg: MESSAGE.PARAMETER_ERROR});
        return;
    }

    var postData = {
        mobile: req.body.contact,
        text:'【双生APP】谢谢您的反馈，' +  req.body.content,
        apikey: YUNPIAN_APIKEY 
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
});

module.exports = router;

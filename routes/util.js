var express = require('express');
var router = express.Router();
var qiniu = require('qiniu');
var UserModel = require('../models').User;
var MessageModel = require('../models').Message;

var QINIU_ACCESS = require('./config').QINIU_ACCESS;
var QINIU_SECRET = require('./config').QINIU_SECRET;
var BUCKET = require('./config').BUCKET;
var MESSAGE = require('./config').MESSAGE;
var ADMIN_USER = require('./config').ADMIN_USER;
var ADMIN_PASSWORD = require('./config').ADMIN_PASSWORD;

qiniu.conf.ACCESS_KEY = QINIU_ACCESS;
qiniu.conf.SECRET_KEY = QINIU_SECRET;

function uptoken(bucket, key) {
    var putPolicy = new qiniu.rs.PutPolicy(bucket + ":" + key);
    return putPolicy.token();
}

/* 获取七牛token */
router.post('/qiniu_token', function (req, res, next) {

    if (req.body.token == undefined || req.body.token == ''
        || req.body.uid == undefined || req.body.uid == ''
        || req.body.filename == undefined || req.body.filename == '') {

        return res.json({status: 1000, msg: MESSAGE.PARAMETER_ERROR});
    }
	var qiniu_token = uptoken(BUCKET, req.body.filename);

    return res.json({status: 0, qiniu_token: qiniu_token, msg: MESSAGE.SUCCESS});
});

/* 后台发送通知 */
router.post('/push_message', function (req, res, next) {

	var timestamp = new Date().getTime();

    if (req.body.user == undefined || req.body.user == ''
        || req.body.password == undefined || req.body.password == ''
        || req.body.type == undefined || req.body.type == ''
        || req.body.title == undefined || req.body.title == ''
        || req.body.content == undefined || req.body.content == ''
        || req.body.user_id == undefined || req.body.user_id == ''
        || req.body.image == undefined || req.body.image == ''
        || req.body.url == undefined || req.body.url == '') {

        return res.json({status: 1000, msg: MESSAGE.PARAMETER_ERROR});
	}

    if (req.body.user !== ADMIN_USER && req.body.password !== ADMIN_PASSWORD) {
        return res.json({status: 3000, msg: MESSAGE.ADMIN_ERROR});
    }

	var message = {
		message_title: req.body.title,
		message_content: req.body.content,
		message_date: timestamp,
		message_type: req.body.type,
		message_image: req.body.image,
		message_url: req.body.url
	}

	MessageModel.create(message).then(function() {
		UserModel.update({
			user_message: 1
		}).then(function() {
			return res.json({status: 0, msg: MESSAGE.SUCCESS});
		});
	});
});

/* utils/answer_feedback */
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

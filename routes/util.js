var express = require('express');
var router = express.Router();
var qiniu = require('qiniu');
var QINIU_ACCESS = require('./config').QINIU_ACCESS;
var QINIU_SECRET = require('./config').QINIU_SECRET;
var BUCKET = require('./config').BUCKET;


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

        return res.json({status: 1})
    }
	var qiniu_token = uptoken(BUCKET, req.body.filename);

    return res.json({status: 0, qiniu_token: qiniu_token});
});

module.exports = router;

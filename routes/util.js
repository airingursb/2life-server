var express = require('express');
var router = express.Router();
var qiniu = require('qiniu');

qiniu.conf.ACCESS_KEY = 'fbVYMBeuMglXqIDmW1H_tlOkb4CrxlLCIUPjGsRV';
qiniu.conf.SECRET_KEY = 'UfLYZXK0ihHkaqTA2QQdzbn1FkDHH0G8oVCaRXMf';

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
	var qiniu_token = uptoken('rideread', req.body.filename);

    return res.json({status: 0, qiniu_token: qiniu_token});
});

module.exports = router;

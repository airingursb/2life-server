# “双生” 服务端文档

## 注册

* url: users/register
* para: user_account, user_name, user_password, user_sex
* response: status, msg, uid, token, timestamp

## 登录

* url: users/login
* para: user_account, user_password
* response: status, msg, uid, token, timestamp, user_sex, user{uid, notes, user_name, sex}, last_connect

## 保存日记

* url: notes/save
* para: uid, token, timestamp, note_content, note_date, note_images
* response: status, msg, note_id

## 读取日记

* url: notes/show
* para: uid, token, timestamp
* response: status, msg, notes{note_id, note_content, note_date, note_images}

## 匹配用户

* url: users/connect
* para: uid, token, timestamp, sex
* response: status, msg, user{uid, notes, user_name, sex}



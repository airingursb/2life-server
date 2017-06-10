var express = require('express');
var router = express.Router();
var UserModel = require('../models').User;
var NoteModel = require('../models').Note;
var sha1 = require('sha1');
var md5 = require('md5');
var MESSAGE = require('./config').MESSAGE;
var KEY = require('./config').KEY;
var log = require('./config').log;

/* notes/save */
router.post('/save', function (req, res, next) {

    var timestamp = new Date().getTime();

    if (req.body.uid == undefined || req.body.uid == ''
        || req.body.token == undefined || req.body.token == ''
        || req.body.timestamp == undefined || req.body.timestamp == ''
        || req.body.note_title == undefined || req.body.note_title == ''
        || req.body.note_content == undefined || req.body.note_content == ''
        || req.body.note_date == undefined || req.body.note_date == '') {
        res.json({status: 1, msg: MESSAGE.PARAMETER_ERROR});
        return;
    }

    log('notes/save');

    var note = {
        note_title: req.body.note_title,
        note_content: req.body.note_content,
        note_date: req.body.note_date,
    };
    UserModel.findOne({
        where: {
            id: req.body.uid
        }
    }).then(function (user) {
        user.createNote(note);
        res.json({status: 0, msg: MESSAGE.SUCCESS});
    });
});

/* notes/delete */
router.post('/delete', function (req, res, next) {

    var timestamp = new Date().getTime();

    if (req.body.uid == undefined || req.body.uid == ''
        || req.body.token == undefined || req.body.token == ''
        || req.body.timestamp == undefined || req.body.timestamp == ''
        || req.body.note_id == undefined || req.body.note_id == '') {
        res.json({status: 1, msg: MESSAGE.PARAMETER_ERROR});
        return;
    }

    log('notes/delete');

    NoteModel.destroy({
        where: {
            id: req.body.note_id
        }
    }).then(function() {
        res.json({status: 0, msg: MESSAGE.SUCCESS})
        return;
    })
});

/* notes/show */
router.post('/show', function (req, res, next) {

    var timestamp = new Date().getTime();

    if (req.body.uid == undefined || req.body.uid == ''
        || req.body.token == undefined || req.body.token == ''
        || req.body.timestamp == undefined || req.body.timestamp == ''
        || req.body.user_id == undefined || req.body.user_id == ''
        || req.body.sex == undefined || req.body.sex == '') {
        res.json({status: 1, msg: MESSAGE.PARAMETER_ERROR});
        return;
    }

    log('notes/show');

    var whereCondition = {userId: req.body.uid};

    if (req.body.user_id !== -1) {
        whereCondition = {userId: [req.body.uid, req.body.user_id]}
    }

    var my_sex = req.body.sex == 0? 'male': 'female';
    var partner_sex = req.body.sex == 0? 'female': 'male';

    NoteModel.findAll({
        include: [UserModel],
        where: whereCondition
    }).then(function(result) {
        var notes = [];
        var user = {};

        result.forEach(function (note) {
            var noteData = {};
            noteData.note_id = note.id;
            noteData.note_title = note.note_title;
            noteData.note_content = note.note_content;
            noteData.note_date = note.note_date;
            
            note.user.id == req.body.uid ? noteData.male = my_sex : noteData.male = partner_sex;
            note.user.id == req.body.uid ? noteData.me = 'yes' : noteData.me = 'no';
            notes.push(noteData);
        });
        res.json({status: 0, data: notes, msg: MESSAGE.SUCCESS});
    }).catch(next);

    return;
});


module.exports = router;

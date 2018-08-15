import express from 'express'
import qiniu from 'qiniu'
import crypto from 'crypto'

import { User, Message, Token } from '../models'

import {
  QINIU_ACCESS,
  QINIU_SECRET,
  BUCKET,
  MESSAGE,
  ADMIN_USER,
  ADMIN_PASSWORD,
  validate,
  JiGuangPush,
  QCLOUD_APPID,
  QCLOUD_SECRETID,
  QCLOUD_SECRETKEY,
  NLP_ID,
  NLP_SECRET,
  WXP_APPID,
  WXP_SECRET
} from '../config/index'

import Promise from 'Promise'

import rp from 'request-promise'

import Capi from 'qcloudapi-sdk'

const capi = new Capi({
  SecretId: NLP_ID,
  SecretKey: NLP_SECRET,
  serviceType: 'wenzhi'
})

const router = express.Router()
qiniu.conf.ACCESS_KEY = QINIU_ACCESS
qiniu.conf.SECRET_KEY = QINIU_SECRET

/* 获取七牛token */
router.get('/qiniu_token', (req, res) => {

  const { uid, timestamp, token, filename } = req.query
  validate(res, true, uid, timestamp, token, filename)

  const putPolicy = new qiniu.rs.PutPolicy(BUCKET + ':' + filename)
  const data = putPolicy.token()

  return res.json({ ...MESSAGE.OK, data })
})

/* 获取 OCR 签名*/
router.get('/get_ocr_sign', (req, res) => {

  const { uid, timestamp, token } = req.query
  validate(res, true, uid, timestamp, token)

  const currentTime = Math.round(Date.now() / 1000)
  const expiredTime = currentTime + 30 * 24 * 60 * 60
  const rand = Math.round(Math.random() * (2 ** 32))
  const origin = `a=${QCLOUD_APPID}&k=${QCLOUD_SECRETID}&e=${expiredTime}&t=${currentTime}&r=${rand}`

  const data = Buffer.from(origin, 'utf8')
  const signTmp = crypto.createHmac('sha1', QCLOUD_SECRETKEY).update(data).digest()
  const bin = Buffer.concat([signTmp, data])
  const sign = Buffer.from(bin).toString('base64')

  return res.json({ ...MESSAGE.OK, data: sign })
})

/* NLP 情感分析接口 */
router.post('/get_nlp_result', (req, res) => {

  const { uid, timestamp, token, content } = req.body
  validate(res, true, uid, timestamp, token)

  const callApi = () => {
    return new Promise((resolve, reject) => {
      capi.request({
        Region: 'gz',
        Action: 'TextSentiment',
        content
      }, (err, d) => {
        resolve(d)
        reject(err)
      })
    })
  }

  const response = async () => {
    const data = await callApi()
    const { positive } = data

    const user = await User.findOne({ where: { id: uid } })

    let total_notes = user.total_notes
    let total_modes = user.mode * total_notes

    if (user.emotions_type) {
      let emotions_basis = user.emotions_basis.split(',')
      let emotions_array = user.emotions.split(',')
      let [e_basis, c_basis, o_basis, a_basis, n_basis] = emotions_basis
      let [total_e, total_c, total_o, total_a, total_n] = emotions_array

      // e, c, o, a, n 取值范围是 0~1，需要从算法服务器的接口中获取
      // let { e, c, o, a, n } = data
      // 目前仅内部灰度测试，不对外使用
      let e = +((Math.random()).toFixed(8))
      let c = +((Math.random()).toFixed(8))
      let o = +((Math.random()).toFixed(8))
      let a = +((Math.random()).toFixed(8))
      let n = +((Math.random()).toFixed(8))

      if (uid === 1 || uid === 2 || uid === 3) {
        const options = {
          method: 'POST',
          uri: 'http://118.24.154.90/ner',
          body: {
            content,
            key: NLP_ID
          },
          json: true
        }
        let mode = await rp(options)
        if (mode.code === 0) {
          e = mode.data.mood_sub_type.E
          c = mode.data.mood_sub_type.C
          a = mode.data.mood_sub_type.A
          n = mode.data.mood_sub_type.N
          o = mode.data.mood_sub_type.O
        }
      }

      e = (total_e * total_notes + e_basis * e) / (total_notes + 1)
      c = (total_c * total_notes + c_basis * c) / (total_notes + 1)
      o = (total_o * total_notes + o_basis * o) / (total_notes + 1)
      a = (total_a * total_notes + a_basis * a) / (total_notes + 1)
      n = (total_n * total_notes + n_basis * n) / (total_notes + 1)

      let emotions = e + ',' + c + ',' + o + ',' + a + ',' + n

      await User.update({
        total_notes: total_notes + 1,
        mode: Math.floor((total_modes + Math.floor(positive * 100)) / (total_notes + 1)),
        emotions
      }, { where: { id: uid } })
    } else {

      await User.update({
        total_notes: total_notes + 1,
        mode: Math.floor((total_modes + Math.floor(positive * 100)) / (total_notes + 1))
      }, { where: { id: uid } })
    }

    return res.json({ ...MESSAGE.OK, data: positive })
  }

  response()
})

/* 获取并刷新心情报告接口 */
router.get('/update_emotion_report', (req, res) => {

  const { uid, timestamp, token } = req.query
  validate(res, true, uid, timestamp, token)

  const response = async () => {
    let user = await User.findOne({ where: { id: uid } })

    if (!user) {
      return res.json(MESSAGE.USER_NOT_EXIST)
    }

    if (!user.emotions || !user.emotions_type) {
      return res.json(MESSAGE.REQUEST_ERROR)
    }

    let emotions = user.emotions.split(',')
    let [e, c, o, a, n] = emotions

    let max = Math.max(e, c, o, a, n)

    let emotions_types, emotions_type, emotions_report = ''
    let tag = ''

    switch (max) {
      case +a:
        tag = 'n'
        emotions_types = ['实干主义者', '心灵多面手', '温和思想家', '自我笃行者']
        emotions_report = `为人谦逊温和，不爱与他人争论。在有意无意中可能会降低自己的原则或者标准，和温柔不同，温和是性格，温柔是态度。你是个温和的人，不爱计较，喜欢忍让，在忍让的过程中，可能会积攒起负能量灾区。一旦导火索被引燃，就容易陷入情绪爆炸。（情绪解读）
你在学业和事业方面是不温不火的，有自己的节奏，或快或慢，但都在自己的掌控当中，不爱跟他人作比较，觉得自己的事情不需要跟他人进行对比。你有一个属于自己的小宇宙。常常沉浸在自我的小世界中。你擅长进行独自深入地思考，常常会有异于常人的灵感迸发。温和的你可以适当的调整自己的步伐，跟随自己的心。心所向，意所达。（学业事业）
温和平静的性格可能帮助你在状态上达到平衡，健康的状态能维持很长时间。但在遇到突发事件时，还可以多增进自己的应激能力。同时可以去尝试新的事物，增长自己的见识和开拓眼界。做一个温文尔雅，内涵饱满的儒雅之士。（健康身心）`
        break
      case +e:
        tag = 'e'
        emotions_types = ['恬淡小天使', '温暖小甜心', '元气小青年', '品质小资']
        emotions_report = `你在工作或学习上尽心尽责、勤奋可靠，你认真、合理地安排自己的精力和时间，以便工作时的每一分钟都能够起到最大的作用，从而提高工作的效率和质量，你容易和同事同学建立良好的关系，获得更多的帮助和支持，但有时候过度地要求自己可能会让你陷入病态的完美主义和强迫行为的困境，“要么不做，要做就要做到最好”并不是一句好的座右铭。尝试着告诉自己——我们必须从整体上接纳和遵从我们生命的限制，然后寻找最佳的或是接近最佳的方式来分配我们的时间和精力。（学业）
你容易获得广泛的社会支持力量，一个丰富的、有支持感的社交生活可以有效降低心血管疾病、癌症的风险，且能使人有更长的寿命。归属感和社会联结可降低心理疾病的风险，增加生活意义感。与医生保持良好的沟通，较少出现酗酒或物质滥用等问题。（健康）
你对待学业和工作认真尽责的态度会对伴侣起到一个良好的促进作用，帮助TA也在自己的领域内获得成就。同时，细心体贴的你更容易悉心照料到伴侣的种种情绪，是个十足的小棉袄，乐于付出的你不妨常和伴侣交流对感情的期望更容易让彼此获得令双方都满意的亲密关系。（爱情）`
        break
      case +c:
        tag = 'c'
        emotions_types = ['躁动小魔王', '科学小怪人', '极致主义者', '暴躁领袖']
        emotions_report = `对生活抱有极大热忱的你，有时候难免会过度关注生活中负面的信息，尤其是与自身相关的方面，所以总是在一个又一个难以入眠的夜晚细细数着白天是否完成自己的计划、离自己的目标有没有更进一步……总是觉得自己没有达到理想中的自己。但正是反复的思考和担忧让你对目标和方向更加清晰明确，也提前对即将到来的困难做好准备。对风险和困难的敏感是你永不停歇的奋斗源泉。（学业）
尽管容易受到负面信息的影响，造成情绪波动，从而进行间歇性的暴饮暴食和抽烟喝酒，若是长时间陷入焦虑但是通常你对自己的健康状况非常警觉，身体上一点小小的问题也会让你警惕起来，去医院寻求治疗，所以重症疾病很容易被你扼杀在萌芽里。天性外向开朗的你更容易在遇到困境或是心情低落时寻求朋友的帮助。（健康）
虽然有时候神经敏感会让你过度解读伴侣的一言一行，例如TA的面无表情会让你认为是一种冷漠无奈的抵抗。但是你会更加容易和伴侣建立起沟通机制。在沟通这件事上，我们总是误以为自己的非言语线索足够让对方明白我们想表达的意思，但其实，不论在一起多久、多么有默契的伴侣也通常难以做到这一点，这时候需要我们冷静下来，把思绪仔细地告诉对方。（爱情）`
        break
      case +o:
        tag = 'o'
        emotions_types = ['厌世大魔王', '灵性创作家', '小世界掌控家', '灵魂多面手']
        emotions_report = `大到漫漫一生，小到一天的安排，你总是对此小心翼翼提心吊胆，似乎失去一丁点的掌控都足以让你窒息抓狂。你很容易受到外界的影响而产生较大的情绪波动，对负面信息比较在意，你经常反复思考和担忧。但也正是这思考，让你比常人更多一份创造力。（情绪解读）
你在学业和事业方面一定是一个相当有创造力的人，你擅长从细节处不断进行深入地思考，从而能够触类旁通不断进行发散，在现有结论的基础上进行再创造。但是有时候不必在细节处过于纠结，而是学会放眼全局，说不定能收获更加开阔的视野。（学业事业）
更加开放的性格可能帮助你在心理上保持健康，心理上的健康不仅指更加积极乐观、对压力的处理能力更强，而且更加容易让你保持健康的饮食和运动习惯。同时你愿意去尝试新的事物，寻求新异和多样性、尝试新的活动更加有利于你在经历创伤事件后的恢复，保持平和开放的心态。（健康身心）`
        break
      case +n:
        tag = 'n'
        emotions_types = ['忧郁小王子', '忧伤小绵羊', '谦和小智者', '忧郁小麋鹿']
        emotions_report = `为人低调谦和，虽然不常生气，但是也没有能很好地控制自己的情绪。你经常需要治愈系的聆听者，希望将自己的心事告诉挚友。你身上总是有温暖的光亮。美好的事物各不相同，世界也瞬息万变，而你是一颗永恒的星星，因为自身会发出温暖而明亮的光芒，所以你不惧怕黑暗，你是如此美好，让恐惧烟消云散，你是这个星球上的一点希望。（情绪解读）
你在学业和事业方面一定是一个相当有潜力的人，不论是脑海里还是胸腔中，都藏着一个大大的宇宙。你擅长从细节处不断进行深入地思考，从而能够触类旁通不断进行发散，在现有结论的基础上进行再创造。但是有时候不必在细节处过于纠结，而是学会放眼全局，说不定能收获更加开阔的视野。（学业事业）
更加开放的性格可能帮助你在心理上保持健康，心理上的健康不仅指更加积极乐观、对压力的处理能力更强，而且更加容易让你保持健康的饮食和运动习惯。同时你愿意去尝试新的事物，寻求新异和多样性、尝试新的活动更加有利于你在经历创伤事件后的恢复，保持平和开放的心态。（健康身心）`
        break
      default:
        break
    }

    if (emotions_types.indexOf(user.emotions_type) !== -1) {
      return res.json({ ...MESSAGE.OK, data: user })
    } else {

      let type_id = Math.floor(Math.random() * 4)
      emotions_type = emotions_types[type_id]
      let emotions_url = tag + type_id

      await User.update({
        emotions_type,
        emotions_report
      }, { where: { id: uid } })
      user = await User.findOne({ where: { id: uid } })
      return res.json({ ...MESSAGE.OK, data: { ...user, emotions_url } })
    }
  }

  response()
})

router.get('/show_act', (req, res) => {

  const { uid, timestamp, token } = req.query
  validate(res, true, uid, timestamp, token)

  // url: 活动主页, shareUrl: 分享页面
  return res.json({ ...MESSAGE.OK, show: true, url: 'https://2life.act.ursb.me/#/', shareUrl: 'https://2life.act.ursb.me/#/invitation' })
})

/* 小程序获取access_token
 * 文档：https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421140183
 */
router.get('/access_token', (req, res) => {
  const { uid, timestamp, token } = req.query
  validate(res, true, uid, timestamp, token)

  const response = async () => {

    const access_token = await Token.findOne({
      where: {
        deadline: { 'gt': Date.now(), 'lt': Date.now() + 7200000 }
      }
    })

    if (!access_token) {
      const options = {
        uri: 'https://api.weixin.qq.com/cgi-bin/token',
        qs: {
          grant_type: 'client_credential',
          appid: WXP_APPID,
          secret: WXP_SECRET
        },
        json: true
      }
      const data = await rp(options)

      await Token.create({
        code: data.access_token,
        deadline: Date.now() + 7000000, // 官方7200秒，这里预留时间防止前端重复请求
        alive: true
      })

      return res.json({ ...MESSAGE.OK, data: { access_token: data.access_token, timestamp: Date.now() } })
    } else {
      return res.json({ ...MESSAGE.OK, data: { access_token, timestamp: Date.now() } })
    }
  }
  response()
})

/* 后台发送通知 */
router.get('/push_message', (req, res) => {
  JiGuangPush(1, '您被另一半解除匹配了:(，多写日记来记录自己的生活吧！')

  const response = async () => {
    await Message.create({
      title: 'Airing 成功匹配到了您，成为您的另一半',
      type: 201,
      content: '',
      image: '',
      url: '',
      date: Date.now(),
      user_id: 1
    })
    return res.json(MESSAGE.OK)
  }
  response()
})

/* 备份服务端日志 */
router.post('/save_logs', (req, res) => {

  const { admin, password } = req.body

  validate(res, false, admin, password)

  const response = async () => {

    if (admin === ADMIN_USER && password === ADMIN_PASSWORD) {
      return res.json(MESSAGE.OK)
    }
  }

  response()
})

/* 图片安全接口回调 */
router.get('/ban_img', (req, res) => {
  const response = async () => {
    return res.json(MESSAGE.OK)
  }
  response()
})

module.exports = router

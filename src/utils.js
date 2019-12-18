import { Token } from './models'
import rp from 'request-promise'

import {
  WXP_APPID,
  WXP_SECRET
} from './config/index'


async function getAccessToken() {
  const access_token = await Token.findOne({
    where: {
      deadline: {
        'gt': Date.now(),
        'lt': Date.now() + 7200000
      }
    },
    raw: true
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

    return data.access_token

  } else {
    return access_token.code
  }
}

async function wechatContentCheck(content) {
  if (!content) {
    return {
      errcode: 0,
      errMsg: 'no content'
    }
  }

  const access_token = await getAccessToken()
  const option = {
    method: 'POST',
    uri: 'https://api.weixin.qq.com/wxa/msg_sec_check?access_token=' + access_token,
    body: {
      content
    },
    json: true
  }

  return await rp(option)
}

async function wechatImgCheck(imgUrl) {
  if (!imgUrl) {
    return {
      errcode: 0,
      errMsg: 'no image'
    }
  }

  const access_token = await getAccessToken()
  const option = {
    method: 'POST',
    uri: 'https://api.weixin.qq.com/wxa/img_sec_check?access_token=' + access_token,
    formData: {
      media: {
        value: await rp(imgUrl),
        options: {
          filename: 'test.jpg',
          contentType: 'image/jpg'
        }
      }
    },
    json: true
  }

  return await rp(option)
}

exports.getAccessToken = getAccessToken
exports.wechatContentCheck = wechatContentCheck
exports.wechatImgCheck = wechatImgCheck

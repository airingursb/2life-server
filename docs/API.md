# “双生” 服务端接口文档

## 1 用户模块 users
### 1.1 登录 login
接口：users/login
方式：POST
参数：account，password
响应：
```json
{
    code: 0,
    message: 'success',
    data: {
        user: {},
        key: {},
        partner: {}
    }
}
```

### 1.2 注册 register
接口：users/register
方式：POST
参数：account，password，code，timestamp
响应：
```json
{
    code: 0,
    message: 'success',
    data: {
        user: {}
    }
}
```

### 1.3 获取短信验证码 code
接口：users/code
方式：POST
参数：account
响应：
```json
{
    code: 0,
    message: 'success',
    data: {
        timestamp: 15792391231
    }
}
```

### 1.4 随机匹配 connect\_by\_random
接口：users/connect\_by\_random
方式：GET
参数：uid，timestamp，token
响应：
```json
{
    code: 0,
    message: 'success',
    data: {}
}
```

### 1.5 定向匹配 connect\_by\_id
接口：users/connect\_by\_id
方式：GET
参数：uid，timestamp，token，user\_id
响应：
```plain
{
    code: 0,
    message: 'success',
    data: {}
}
```

### 1.6 解除匹配 disconnect
接口：users/disconnect
方式：GET
参数：uid，timestamp，token
响应：
```json
{
    code: 0,
    message: 'success'
}
```

### 1.7 更新用户信息 update
接口：users/update
方式：POST
参数：uid，timestamp，token，name，face，sex
响应：
```json
{
    code: 0,
    message: 'success'
}
```

### 1.8 获取用户信息 user
接口：users/user
方式：GET
参数：uid，timestamp，token，user\_id
响应：
```json
{
    code: 0,
    message: 'success',
    data: {}
}
```

### 1.9 验证码登录注册接口 code\_login
接口：users/code\_login
方式：POST
参数：account，code
响应：

### 1.10 微信登录接口 oauth\_login
接口：users/oauth\_login
方式：POST
参数：
响应：


### 1.11 获取通知信息接口 show\_notification
接口：users/show\_notification
方式：GET
参数：uid，timestamp，token
响应：
```json
{
    code: 0,
    message: 'success',
    data: []
}
```


## 2. 日记模块 notes
### 2.1 发布日记 publish
接口：notes/publish
方式：POST
参数：uid，timestamp，token，title，content，images，latitude，longitude，mode
响应：
```json
{
    code: 0,
    message: 'success'
}
```

### 2.2 删除日记 delete
接口：notes/delete
方式：GET
参数：uid，timestamp，token，note\_id
响应：
```json
{
    code: 0,
    message: 'success'
}
```

### 2.3 点赞日记 like
接口：notes/like
方式：POST
参数：uid，timestamp，token，note\_id
响应：
```json
{
    code: 0,
    message: 'success'
}
```


### ~~2.5 随机推荐日记 recommend~~
<span data-type="color" style="color: rgb(245, 34, 45);">说明：弃用，合并至notes/list </span>:disappointed_relieved:
接口：notes/recommend
方式：GET
参数：uid，timestamp，token
响应：

### 2.6 获取日记列表 list
接口：notes/list
方式：GET
参数：uid，timestamp，token
响应：
```json
{
    code: 0,
    message: 'success',
    data: {
        user: [],
        partner: [],
        recommend: {}
    }
}
```

### 2.7 根据时间日记列表 show\_by\_time
接口：notes/show\_by\_time
方式：GET
参数：uid，timestamp，token，from\_timestamp
<span data-type="color" style="color: rgb(24, 144, 255);">说明：本接口用于差额获取日记数据，</span>from\_timestamp 为上次同步的时间。
响应：
```json
{
    code: 0,
    message: 'success',
    data: {
        user: [],
        partner: [],
        recommend: {}
    }
}
```

### 2.8 同步日记数据 sync
接口：notes/sync
方式：POST
参数：uid，timestamp，token，data
响应：

### 2.9 编辑日记 update
接口：notes/update
方式：POST
参数：uid，timestamp，token，note\_id，title，content，images，mode
响应：
```json
{
    code: 0,
    message: 'success'
}
```


## 3 情绪模块 modes
### ~~3.1 修改日记情绪值 update\_mode~~
说明：<span data-type="color" style="color: rgb(245, 34, 45);">弃用，合并到 notes/update </span>:disappointed_relieved:
接口：modes/update\_mode
方式：POST
参数：uid，timestamp，token，note\_id，mode
响应：
```json
{
    code: 0,
    message: 'success'
}
```

### 3.2 显示情绪图表 show
接口：modes/show
方式：GET
参数：uid，timestamp，token
响应：

## 4 工具模块 utils
### 4.1 请求上传图片接口 qiniu\_token
接口：utils/qiniu\_token
方式：GET
参数：uid，timestamp，token，filename
响应：
```json
{​
    code: 0,
    message: 'success',
    data: {}
}
```


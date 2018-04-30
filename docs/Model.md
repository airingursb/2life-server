# “双生” 服务端模型文档

1. 用户模块
2. 日记模块
3. 通知模块

## 用户模块 
### 1. User
* id
* code：用户id，匹配用
* account
* password
* name
* sex
* face
* status：用户的状态（详见数据字典）
* total\_notes：日记总数
* mode：平均情绪值
* last\_times：本月剩余匹配次数
* total\_times：已匹配次数
* badges：已拥有徽章id，英文逗号隔开
* badge\_id：用户选择展示的徽章id
* rate：用户评分
* connect\_at：最近一次匹配时间
* openid：微信openid
* other\_user\_id：匹配用户id
* ban\_id：用户黑名单，英文逗号隔开
* unread：用户未读消息数

#### 数据字典
sex:
* 0：男
* 1：女

status: 
* 0：未匹配，刚解除匹配的临界状态
* 101：未匹配，期待异性，性格相同，主体男
* 102：未匹配，期待异性，性格互补，主体男
* 103：未匹配，期待异性，性格随意，主体男
* 111：未匹配，期待异性，性格相同，主体女
* 112：未匹配，期待异性，性格互补，主体女
* 113：未匹配，期待异性，性格随意，主体女
* 201：未匹配，期待同性，性格相同，主体男
* 202：未匹配，期待同性，性格互补，主体男
* 203：未匹配，期待同性，性格随意，主体男
* 211：未匹配，期待同性，性格相同，主体女
* 212：未匹配，期待同性，性格互补，主体女
* 213：未匹配，期待同性，性格随意，主体女
* 501：无匹配次数
* 502：无匹配权限（无日记）
* 503：无匹配权限（永久封禁）
* 504：无匹配权限（有限封禁）
* 999：关闭匹配
* 1000：已匹配

### 2. Badge
* id
* name
* image
* bio

### 3. Award
* id
* code
* badge\_id
* used

## 日记模块 
### 1. Note
* id
* user\_id
* title
* content
* images：日记的配图url，英文逗号隔开
* latitude
* longitude
* location
* is\_liked
* mode
* date: 创建日记时间戳
* status：写日记时用户的状态

#### 数据字典
is\_liked:
* 0：未被喜欢
* 1：已被喜欢

## 通知模块
### 1. Message
* id
* title
* type
* content
* image
* url
* date：创建通知的时间戳
* user\_id

#### 数据字典
type：
* 0：系统消息（被ban、无次数等）
* 101：通知（无url，有content）
* 102：活动、宣传等（有url，有content）
* 201：被匹配（无url，无content）
* 202：被解除匹配（无url，无content）
* 203：被喜欢（无url，无content）

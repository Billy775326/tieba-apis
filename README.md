# Tieba APIs

百度贴吧 PC 网页接口研究与验收工具，面向需要查询接口、核对请求参数或继续开发贴吧集成的使用者。已实测帖子读取、搜索、点赞、回复、收藏、关注、签到及发主帖；可运行的公开入口目前提供离线查询和网页只读验收，写入能力以定向实测与契约文档交付。

[快速开始](#快速开始) · [功能列表](#功能) · [接口文档](docs/api.md) · [调用示例](docs/pc-web-examples.md) · [全部文档](docs/README.md) · [更新日志](CHANGELOG.md)

## 功能

下表逐项列出常用 PC 功能。**已验收**表示有网页对象或状态回查；**结构核对**表示收到数据但尚未完成整项业务验收；**待验收**不作为已支持功能宣传。当前公开工具提供读取验收，写入仍是定向实测，尚无通用 PC 写入 SDK。

| 功能 | PC 接口 | 当前状态 |
| --- | --- | --- |
| 复用网页登录态、本人信息 | `/f/user/json_userinfo`、`/c/u/user/getPrivateInfo_pc` | 两个现有网页会话已核对；不导出 Cookie |
| 帖子详情、吧详情和列表 | page_pc、threadlist_pc、generalTabList_pc | 详情和批量列表对象已核对；通用 tab 返回空 page_data，非空分支未通过 |
| 普通回复读取与定位 | `/c/f/pb/getmypost_pc` | 已以新建本人回复核对编号、作者和内容 |
| 楼中楼列表 | `/c/f/pb/nestedFloor` | 已核对父回复中的新楼中楼，删除后回查为空 |
| 点赞、取消点赞 | `/c/c/agree/opAgree_pc` | 帖子和普通回复均已验证并恢复；楼中楼点赞未单独测试 |
| 发表普通回复 | `/c/c/post/add_pc` | 已创建、回读并删除本次测试回复 |
| 回复楼中楼 | `/c/c/post/add_pc`，补 quote_id/repostid | 已验证创建、父子归属、本人作者及清理 |
| 删除本人回复、楼中楼 | `/c/c/bawu/delpost_pc` | 已验证，仅删除本次创建的本人内容 |
| 收藏、取消收藏 | addstore_pc、GET/POST rmstore_pc | 两种取消方式均有状态回查，未收藏基线已恢复 |
| 关注用户、取消关注 | `/c/c/user/follow_pc`、`unfollow_pc` | 两账号已验证变化并恢复 |
| 关注贴吧、取消关注贴吧 | POST `/c/c/forum/like_pc`、`unfavolike_pc` | 已验证临时关注、回查并恢复；GET 变体未测 |
| 发表主帖、删除本人主帖 | `/c/c/thread/add_pc`、`/c/c/bawu/delthread_pc` | 官方编辑器创建一条主帖，核对作者、标题与首楼正文后删除；详情与首楼定位均回到 4 |
| 搜索建议、帖子/吧/用户及综合搜索 | `/c/s/searchSug_pc`、`/mo/q/search/*` | 已核对精确吧、指定帖子、吧内搜索与受控用户；未覆盖全部排序和分页 |
| 签到 | `/c/c/forum/sign_pc` | 已核对未签到 → 已签到及重复签到分支；临时关注已恢复，签到日记录保留 |
| 用户卡片、吧卡片 | `/c/u/pc/userCard`、`/c/f/pc/forumCard` | 已核对请求对象 |
| 关注、粉丝、主帖与收藏列表 | followList_pc、fans/page_pc、myThread、threadStoreList | 已核对有效对象；myThread 参数已修正。点赞列表 userAgree_pc 仍需区分线程与回复点赞语义 |
| 获赞、提及和回复通知 | agreeme_pc、atme_pc、replyme_pc | 双账号已制造并匹配三类新事件；提及、回复的源码 POST 也已匹配，获赞 POST 保留结构级结果 |
| 隐私、黑名单、个人简介 | setprivate_pc、setUserBlack_pc、modify_pc | 均已修改、回读并恢复；未改昵称或测试昵称冷却 |
| 主页隐藏、移除粉丝、徽章 | setPrivacy_pc、removeFans_pc、setIcon/cancelIconSlot | 自有主帖隐藏恢复、受控粉丝移除与关系恢复、原徽章摘下恢复均已核对 |
| 图片上传与智能标题 | uploadPicture_pc、generateTitle | 专用 PNG 上传返回引用，图片回复回读并清理；标题返回 5 条非空结果 |
| 头像、图片列表、视频等 | portrait_pc、picture/list 等 | 同原头像提交返回 300003；图片列表用有效图片回复仍返回 4444；不推断为账号权限不足 |
| 游戏预约与招募 | subscribeitempc、recruit/register | 预约 GET/POST 首次成功，保留 2 项预约；招募报名及即时资格成功，取消两次返回 990000，报名未恢复 |
| 社区提示、版本切换与推荐反馈 | communityNoticeReport、updateSwitch、submitDislike_pc | 实际提示已关闭；旧版切回新版已恢复；推荐反馈仅确认接收，未验证撤回 |
| 私信、群聊 | 当前前端为 App 引导；未建立 PC 原生收发入口 | 不以 App IM 成功代替网页通过 |
| 吧务 | 管理员置顶、加精、禁言等 | 账号无实际吧务角色，3 项管理写入未执行；分类、原因读取另有实际响应 |

点赞、回复、楼中楼、删除和收藏的参数及判据见 [PC 基础功能](docs/pc-web-basic-functions.md)。新增写入、逐项限制及未恢复状态见 [扩展验收](docs/pc-web-complete-acceptance.md)。**本轮保留 2 项游戏预约及 1 项已获即时资格的招募报名，不能声称全部状态已恢复。**

## 快速开始

### 运行环境

| 环境 | 要求 |
| --- | --- |
| Node.js | 24+，原生 ESM，无第三方 npm 运行依赖 |
| Chrome | 只在联网验收时需要；使用专用配置目录和已扫码会话 |
| 示例终端 | Windows PowerShell；npm 命令写作 npm.cmd |

### 获取项目

从仓库默认分支获取项目：

```powershell
git clone https://github.com/Billy775326/tieba-apis.git
cd tieba-apis
node --version
```

已有工作区直接在仓库根目录执行后续命令，不需要为更新文档重新克隆。安装 Node.js 后即可运行下列工具，无需额外 npm install；APK、JDK 和安卓环境只涉及历史研究。

### 配置网页登录态

PC 入口通过本机 Chrome 复用网页登录态。按 [浏览器准备步骤](docs/pc-web-validation.md#准备浏览器会话) 打开专用窗口并扫码，保持官方首页或论坛页打开。

| 配置项 | 本文示例 | 说明 |
| --- | --- | --- |
| 调试端口 | 9222 | 实际 Chrome 端口，通过 --port 传入 |
| 浏览器配置目录 | .local/pc-web-browser | 启动 Chrome 时指定，保留扫码会话 |
| 帖子目标 | [redacted-thread-id] | --thread 接受编号或官方帖子 URL |
| 测试吧 | [redacted-forum-name] | --forum 可选；与指定帖子是独立读取目标 |
| 验收输出 | .local 下的新文件 | 默认自动生成唯一文件名；--output 可指定新路径 |

PC 工具不读取 .env、config.example.json 或账号 JSON。Cookie、TBS 和防护令牌由网页管理，不需要粘贴到配置；旧 App 配置的适用范围见 [使用指南](docs/getting-started.md#配置文件)。

## 离线查询

```powershell
node scripts/catalog.mjs --pc-web search
node scripts/catalog.mjs --pc-status sign_pc
node scripts/verify-pc-web.mjs --help
```

--pc-web 查源码请求声明，--pc-status 查保存的验收状态；不带关键词时只显示摘要，均不联网。按功能查找点赞、回复、搜索、签到和发帖的示例见 [调用示例](docs/pc-web-examples.md)。

## 复跑网页读取验收

Chrome 已按上面的示例在 9222 端口登录后：

```powershell
node scripts/verify-pc-web.mjs --live --port 9222 --thread "$env:TIEBA_TEST_THREAD" --forum "$env:TIEBA_TEST_FORUM"
```

等价 npm 入口为 `npm.cmd run verify:pc -- --live --port 9222 --thread "$env:TIEBA_TEST_THREAD" --forum "$env:TIEBA_TEST_FORUM"`。省略 --live 时只显示帮助；入口检查帖子/吧、本人信息、通知及配置等固定读取项。它不会执行功能表里的点赞、签到或发帖操作。

终端显示每项状态及最终输出文件；文件只含 HTTP/业务码、结构计数、摘要和对象断言，完整字段与退出码见 [使用指南](docs/getting-started.md#查看运行结果)。凭据和用户响应正文留在浏览器。结果默认使用新文件，已有输出不会被覆盖。

## 项目目录

```text
tieba-apis/
├─ scripts/
│  ├─ catalog.mjs                  # 源码清单与验收状态查询
│  ├─ verify-pc-web.mjs            # 网页只读验收入口
│  ├─ build-pc-web-catalog.mjs     # 从固定脚本提取请求清单
│  └─ build-pc-web-coverage.mjs    # 从公开报告生成覆盖 CSV
├─ src/pc-web-browser.mjs         # 本机 CDP 连接
├─ src/pc-web-validation.mjs      # 结果分级
├─ evidence/                     # 脱敏来源与验收证据
├─ docs/                         # 使用、接口、示例、开发和历史报告
├─ tests/                        # 离线测试
├─ .local/                       # 忽略的浏览器配置、原始数据和临时输出
└─ main.mjs                      # 保留的历史 App CLI
```

按入口、认证、请求和结果职责说明的完整结构见 [架构文档](docs/architecture.md)。

## 常见问题

- **为什么接口已验收，却没有对应发布命令？** 功能验收和通用封装分别记录。当前公开工具只读，写入的有效组合及回查流程见 [基础交互](docs/pc-web-basic-functions.md) 和 [签到、搜索与主帖](docs/pc-web-sign-search-publish.md)。
- **可以直接用 TiebaApi 操作 PC 接口吗？** 该类属于保留的 App 协议客户端，具体方法见 [历史 App API](docs/api.md#历史-app-客户端)。PC 入口和配置单独维护。
- **读取返回 HTTP 200 就算成功吗？** 仍需明确业务码和目标断言；仅结构匹配、空结果及业务错误会单独标记，见 [结果说明](docs/pc-web-validation.md#结构核对空结果与错误)。

## 当前 PC 范围

| 项目 | 当前记录 |
| --- | --- |
| 前端源码 | 4 个清单基线脚本；补充 4 个官方脚本确认参数和流程，不扩增冻结候选数量 |
| 静态请求候选 | 84 个路径、86 个路径/方法组合；不是全部已可用接口 |
| PC 累计实测 | 390 条业务记录：原 141 条加本轮 249 条；身份准备和页面外壳读取另计，资源及令牌请求不计入 |
| 已请求候选 | 82 / 86 个路径/方法组合；62 个有对象或状态证据，其中招募等存在恢复限制 |
| 其他结果 | 13 个结构核对、1 个空分支、6 个业务错误；4 个未发出有效请求（3 项吧务写入、1 项真实广告事件） |
| 可复跑入口 | 连接已登录的本机 Chrome，只验证网页读取接口 |

帖子详情 `page_pc` 使用 `kz`，已核对指定帖子；论坛页、本人隐私、用户卡片和吧卡片完成对象核对。PC `follow_pc / unfollow_pc` 已完成关注、回查、取消关注与恢复原关系。通知与列表按方法分别记录，获赞 GET 的新事件匹配不自动提升同路径 POST。所有候选都有状态与限制，仍不能宣称全部接口通过。

逐项结果见 [PC 接口覆盖 CSV](docs/pc-web-api-coverage.csv)、[验收说明](docs/pc-web-validation.md) 和 [脱敏证据](evidence/pc-web-validation.json)。

## 文档与代码

| 入口 | 用途 |
| --- | --- |
| [常见调用示例](docs/pc-web-examples.md) | 按功能定位接口、查询状态、读取报告和运行只读验收 |
| [全部文档目录](docs/README.md) | 当前 PC 使用、API、架构、开发与历史研究导航 |
| [基础功能与参数](docs/pc-web-basic-functions.md) | 点赞、回复、楼中楼、删除本人内容和收藏 |
| [签到、搜索与发主帖](docs/pc-web-sign-search-publish.md) | 三项业务的参数、状态、主帖清理与失败边界 |
| [PC 验收指南](docs/pc-web-validation.md) | 参数、当前结果、失败原因、样本和浏览器准备 |
| [PC 覆盖 CSV](docs/pc-web-api-coverage.csv) | 86 个候选逐项状态 |
| [PC 源码清单](evidence/pc-web-api-catalog.json) | 当前官方脚本、请求方法和源码位置 |
| [PC 脱敏记录](evidence/pc-web-validation.json) | 累计 390 条调用、逐项结果与历史阶段 |
| [扩展验收及限制](docs/pc-web-complete-acceptance.md) | 249 条新增响应、资料/隐私/通知/媒体、预约及招募恢复限制 |
| [资源说明](docs/acceptance.md) | 当前需要哪些资源及历史基础验收 |
| [开发指南](docs/development.md) | 环境、检查与历史提取流程 |
| [CHANGELOG](CHANGELOG.md) | 待发布变化 |

PC 工具位于 `scripts/build-pc-web-catalog.mjs`、`scripts/catalog.mjs`、`scripts/verify-pc-web.mjs`，共用本机 CDP 连接和结果分级模块位于 `src/pc-web-*.mjs`。

## 历史 App 研究

仓库仍保留 12 个 App `TiebaApi` 方法及独立 IM 查询，接口约定见 [API 文档的历史 App 部分](docs/api.md#历史-app-客户端)，历史示例见 [使用指南](docs/getting-started.md#历史-app-客户端使用)，分层见 [架构说明](docs/architecture.md#历史-app-客户端结构)。这些接口不属于当前 PC 交付入口，不将 APK 模型、Socket 命令或 App 私信成功算作网页通过。

固定 APK 为 Android 22.13.1.1，SHA-256 `06aa06e4579758e7fd33afe7d1a31a257c8ae6251965f3d8235b68cd965f2be3`；原网络面和边界见 [APK 清单](docs/network-inventory.md)。当前未设置 LICENSE 文件。

## 文档参考

文档组织参考 [cv-cat/DouYin_Spider 的 README](https://github.com/cv-cat/DouYin_Spider/blob/d151f9c2980abc304c1ae4918c2272675cd9e4c2/README.md)：按功能、环境、配置、运行入口和模块职责引导使用，再通过接口与示例文档展开。采用本项目真实的 Node.js、浏览器会话和验收边界，参考版本与对应关系见 [架构文档](docs/architecture.md#参考来源)。

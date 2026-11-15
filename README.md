# Tieba APIs

百度贴吧 **PC 网页接口**的提取、查询与验收项目，使用 Node.js 24+。当前按官方 PC 前端脚本和真实网页会话核对接口，不需要安卓手机；网页登录态由浏览器管理，不导出 Cookie。

早期 Android APK、App Socket 和 IM SDK 研究保留为历史材料，不计入 PC 网页接口的可用数量。

## 功能

下表逐项列出常用 PC 功能。**已验收**表示有网页对象或状态回查；**结构核对**表示收到数据但尚未完成整项业务验收；**待验收**不作为已支持功能宣传。当前公开工具提供读取验收，写入仍是定向实测，尚无通用 PC 写入 SDK。

| 功能 | PC 接口 | 当前状态 |
| --- | --- | --- |
| 复用网页登录态、本人信息 | `/f/user/json_userinfo`、`/c/u/user/getPrivateInfo_pc` | 两个现有网页会话已核对；不导出 Cookie |
| 帖子详情、吧详情和列表 | `/c/f/pb/page_pc`、`/c/f/frs/page_pc` | 已核对目标；专用 threadlist/tab 接口仍有 300000 待定位 |
| 普通回复读取与定位 | `/c/f/pb/getmypost_pc` | 已以新建本人回复核对编号、作者和内容 |
| 楼中楼列表 | `/c/f/pb/nestedFloor` | 已核对父回复中的新楼中楼，删除后回查为空 |
| 点赞、取消点赞 | `/c/c/agree/opAgree_pc` | 帖子和普通回复均已验证并恢复；楼中楼点赞未单独测试 |
| 发表普通回复 | `/c/c/post/add_pc` | 已创建、回读并删除本次测试回复 |
| 回复楼中楼 | `/c/c/post/add_pc`，补 quote_id/repostid | 已验证创建、父子归属、本人作者及清理 |
| 删除本人回复、楼中楼 | `/c/c/bawu/delpost_pc` | 已验证，仅删除本次创建的本人内容 |
| 收藏、取消收藏 | `/c/c/post/addstore_pc`、POST `rmstore_pc` | 已观察变化并恢复未收藏基线；GET 变体未测试 |
| 关注用户、取消关注 | `/c/c/user/follow_pc`、`unfollow_pc` | 两账号已验证变化并恢复 |
| 关注贴吧、取消关注贴吧 | POST `/c/c/forum/like_pc`、`unfavolike_pc` | 已验证临时关注、回查并恢复；GET 变体未测 |
| 发表主帖、删除本人主帖 | `/c/c/thread/add_pc`、`/c/c/bawu/delthread_pc` | 官方编辑器创建一条主帖，核对作者、标题与首楼正文后删除；详情与首楼定位均回到 4 |
| 搜索建议、帖子/吧/用户及综合搜索 | `/c/s/searchSug_pc`、`/mo/q/search/*` | 已核对精确吧、指定帖子、吧内搜索与受控用户；未覆盖全部排序和分页 |
| 签到 | `/c/c/forum/sign_pc` | 已核对未签到 → 已签到及重复签到分支；临时关注已恢复，签到日记录保留 |
| 用户卡片、吧卡片 | `/c/u/pc/userCard`、`/c/f/pc/forumCard` | 已核对请求对象 |
| 关注、粉丝、点赞与收藏列表 | followList_pc、fans/page_pc、userAgree_pc、threadStoreList | 已做结构核对；本人主帖列表 myThread 仍有 210009 |
| 获赞、提及和回复通知 | agreeme_pc、atme_pc、replyme_pc | 非空结构已核对，未验证完整新通知送达 |
| 隐私修改、黑名单、资料编辑 | setprivate_pc、setUserBlack_pc、modify_pc | 源码已定位，PC 修改流程待验收 |
| 图片/头像上传、视频等媒体 | uploadPicture_pc、portrait_pc 等 | 未完成 PC 媒体写入验收 |
| 私信、群聊 | 当前前端为 App 引导；未建立 PC 原生收发入口 | 不以 App IM 成功代替网页通过 |
| 吧务 | 管理员置顶、加精、删他人内容等 | 按原要求不测；不影响上面的删除本人回复验收 |

点赞、回复、楼中楼、删除和收藏的参数及判据见 [PC 基础功能](docs/pc-web-basic-functions.md)。

## 当前 PC 范围

| 项目 | 当前记录 |
| --- | --- |
| 前端源码 | 当前页面加载的 4 个官方脚本，记录 URL、大小、SHA-256 和引用位置 |
| 静态请求候选 | 84 个路径、86 个路径/方法组合；不是全部已可用接口 |
| PC 累计实测 | 141 条业务调用记录（70 条初始记录、26 条基础功能、45 条签到/搜索/主帖验收）；公开验收入口另有 2 次身份读取，本次验收准备另有 2 次，页面资源与后台令牌请求不计入 |
| 已请求候选 | 42 个路径/方法组合，其中 24 个完成对象或状态核对 |
| 其他结果 | 13 个仅结构核对、2 个空结果、3 个业务错误；44 个尚未验证，包含 6 个按原要求排除的吧务候选 |
| 可复跑入口 | 连接已登录的本机 Chrome，只验证网页读取接口 |

帖子详情 `page_pc` 使用 `kz`，已核对指定帖子；论坛页、本人隐私、用户卡片和吧卡片完成对象核对。PC `follow_pc / unfollow_pc` 已完成关注、回查、取消关注与恢复原关系。通知与本人列表等读取仍按实际样本区分结构核对和完整业务验收。

逐项结果见 [PC 接口覆盖 CSV](docs/pc-web-api-coverage.csv)、[验收说明](docs/pc-web-validation.md) 和 [脱敏证据](evidence/pc-web-validation.json)。

## 离线查询

在仓库根目录执行，无需第三方 npm 依赖、浏览器或账号：

```powershell
node scripts/catalog.mjs --pc-web
node scripts/catalog.mjs --pc-web page_pc
node scripts/catalog.mjs --pc-status follow_pc
npm.cmd test
```

也可使用 `npm.cmd run catalog:pc`、`npm.cmd run status:pc` 和 `npm.cmd run verify:pc -- --help`。

`--pc-web` 查看源码声明，`--pc-status` 查看已保存验收结果；不带关键词时只显示摘要，不联网。

## 复跑网页读取验收

使用已扫码登录的专用 Chrome 调试会话，并保留官方 PC 首页或论坛页。已有本项目扫码窗口时：

```powershell
$pcBrowserPort = Get-Content .local/login-browser/DevToolsActivePort -First 1
node scripts/verify-pc-web.mjs --live --port $pcBrowserPort --thread 11185790604 --forum 雷神加速
```

没有现成会话时，按 [网页验收指南](docs/pc-web-validation.md#准备浏览器会话) 启动专用 Chrome 并扫码。脚本默认只显示帮助，必须显式提供 `--live` 与本机调试端口才请求服务；只读白名单包含帖子/吧详情、本人列表、通知和配置，不发帖、不关注、不删除。

结果默认写入 `.local/` 的唯一新文件，已有文件不会被覆盖。输出仅含状态、字段名、列表长度、摘要和断言，Cookie、TBS、防护令牌及用户响应正文不离开浏览器。

## 文档与代码

| 入口 | 用途 |
| --- | --- |
| [全部文档目录](docs/README.md) | 当前 PC 使用、API、架构、开发与历史研究导航 |
| [基础功能与参数](docs/pc-web-basic-functions.md) | 点赞、回复、楼中楼、删除本人内容和收藏 |
| [签到、搜索与发主帖](docs/pc-web-sign-search-publish.md) | 三项业务的参数、状态、主帖清理与失败边界 |
| [PC 验收指南](docs/pc-web-validation.md) | 参数、当前结果、失败原因、样本和浏览器准备 |
| [PC 覆盖 CSV](docs/pc-web-api-coverage.csv) | 86 个候选逐项状态 |
| [PC 源码清单](evidence/pc-web-api-catalog.json) | 当前官方脚本、请求方法和源码位置 |
| [PC 脱敏记录](evidence/pc-web-validation.json) | 累计 141 条调用、受控状态恢复和最初验证器问题 |
| [资源说明](docs/acceptance.md) | 当前需要哪些资源及历史基础验收 |
| [开发指南](docs/development.md) | 环境、检查与历史提取流程 |
| [CHANGELOG](CHANGELOG.md) | 待发布变化 |

PC 工具位于 `scripts/build-pc-web-catalog.mjs`、`scripts/catalog.mjs`、`scripts/verify-pc-web.mjs`，共用本机 CDP 连接和结果分级模块位于 `src/pc-web-*.mjs`。

## 历史 App 研究

仓库仍保留 12 个 App `TiebaApi` 方法及独立 IM 查询，接口约定见 [API 文档的历史 App 部分](docs/api.md#历史-app-客户端)，历史示例见 [使用指南](docs/getting-started.md#历史-app-客户端使用)，分层见 [架构说明](docs/architecture.md#历史-app-客户端结构)。这些接口不属于当前 PC 交付入口，不将 APK 模型、Socket 命令或 App 私信成功算作网页通过。

固定 APK 为 Android 22.13.1.1，SHA-256 `06aa06e4579758e7fd33afe7d1a31a257c8ae6251965f3d8235b68cd965f2be3`；原网络面和边界见 [APK 清单](docs/network-inventory.md)。项目早期分层参考 [cv-cat/DouYin_Spider](https://github.com/cv-cat/DouYin_Spider/tree/d151f9c2980abc304c1ae4918c2272675cd9e4c2)。当前未设置 LICENSE 文件。

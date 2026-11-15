# Tieba APIs

百度贴吧 PC 网页接口研究与验收工具，面向需要查询接口、核对请求参数或继续开发贴吧集成的使用者。已实测帖子读取、搜索、点赞、回复、收藏、关注、签到及发主帖；可运行的公开入口目前提供离线查询和网页只读验收，写入能力以定向实测与契约文档交付。

[快速开始](#快速开始) · [功能列表](#功能) · [接口文档](docs/api.md) · [调用示例](docs/pc-web-examples.md) · [全部文档](docs/README.md) · [更新日志](CHANGELOG.md)

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
| 帖子目标 | 11185790604 | --thread 接受编号或官方帖子 URL |
| 测试吧 | 雷神加速 | --forum 可选；与指定帖子是独立读取目标 |
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
node scripts/verify-pc-web.mjs --live --port 9222 --thread 11185790604 --forum 雷神加速
```

等价 npm 入口为 `npm.cmd run verify:pc -- --live --port 9222 --thread 11185790604 --forum 雷神加速`。省略 --live 时只显示帮助；入口检查帖子/吧、本人信息、通知及配置等固定读取项。它不会执行功能表里的点赞、签到或发帖操作。

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
| 前端源码 | 当前页面加载的 4 个官方脚本，记录 URL、大小、SHA-256 和引用位置 |
| 静态请求候选 | 84 个路径、86 个路径/方法组合；不是全部已可用接口 |
| PC 累计实测 | 141 条业务调用记录（70 条初始记录、26 条基础功能、45 条签到/搜索/主帖验收）；公开验收入口另有 2 次身份读取，本次验收准备另有 2 次，页面资源与后台令牌请求不计入 |
| 已请求候选 | 42 个路径/方法组合，其中 24 个完成对象或状态核对 |
| 其他结果 | 13 个仅结构核对、2 个空结果、3 个业务错误；44 个尚未验证，包含 6 个按原要求排除的吧务候选 |
| 可复跑入口 | 连接已登录的本机 Chrome，只验证网页读取接口 |

帖子详情 `page_pc` 使用 `kz`，已核对指定帖子；论坛页、本人隐私、用户卡片和吧卡片完成对象核对。PC `follow_pc / unfollow_pc` 已完成关注、回查、取消关注与恢复原关系。通知与本人列表等读取仍按实际样本区分结构核对和完整业务验收。

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
| [PC 脱敏记录](evidence/pc-web-validation.json) | 累计 141 条调用、受控状态恢复和最初验证器问题 |
| [资源说明](docs/acceptance.md) | 当前需要哪些资源及历史基础验收 |
| [开发指南](docs/development.md) | 环境、检查与历史提取流程 |
| [CHANGELOG](CHANGELOG.md) | 待发布变化 |

PC 工具位于 `scripts/build-pc-web-catalog.mjs`、`scripts/catalog.mjs`、`scripts/verify-pc-web.mjs`，共用本机 CDP 连接和结果分级模块位于 `src/pc-web-*.mjs`。

## 历史 App 研究

仓库仍保留 12 个 App `TiebaApi` 方法及独立 IM 查询，接口约定见 [API 文档的历史 App 部分](docs/api.md#历史-app-客户端)，历史示例见 [使用指南](docs/getting-started.md#历史-app-客户端使用)，分层见 [架构说明](docs/architecture.md#历史-app-客户端结构)。这些接口不属于当前 PC 交付入口，不将 APK 模型、Socket 命令或 App 私信成功算作网页通过。

固定 APK 为 Android 22.13.1.1，SHA-256 `06aa06e4579758e7fd33afe7d1a31a257c8ae6251965f3d8235b68cd965f2be3`；原网络面和边界见 [APK 清单](docs/network-inventory.md)。当前未设置 LICENSE 文件。

## 文档参考

文档组织参考 [cv-cat/DouYin_Spider 的 README](https://github.com/cv-cat/DouYin_Spider/blob/d151f9c2980abc304c1ae4918c2272675cd9e4c2/README.md)：按功能、环境、配置、运行入口和模块职责引导使用，再通过接口与示例文档展开。采用本项目真实的 Node.js、浏览器会话和验收边界，参考版本与对应关系见 [架构文档](docs/architecture.md#参考来源)。

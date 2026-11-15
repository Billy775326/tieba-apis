# 原生 App Socket 协议与继续验证

> 历史 App 研究：本文是旧 App Socket 的固定阶段报告，63 次业务/媒体请求与 8 次握手保持原统计；Socket 命令不计入 PC 路径/方法覆盖。当前网页功能见 [README 功能表](../README.md#功能)，参数与验收见 [PC 网页指南](pc-web-validation.md)。

本文记录贴吧 Android 22.13.1.1 的旧 App WebSocket 协议恢复，以及 2026-11-14 的继续实测。适合查找命令、字段和验收边界的开发者。**本阶段有 63 次业务/媒体请求、8 次握手探测；10 个 Socket 命令已实际发送，并非全部接口均已功能验收。** 两个账号的黑名单、单个会话提醒设置均恢复原值。

完整脱敏记录见 [continued-discovery-validation.json](../evidence/continued-discovery-validation.json)，字段与传输见 [app-socket-contracts.json](../evidence/app-socket-contracts.json)。这条链路与此前私信、SDK 群聊使用的 [IM TLS/LCP](im-validation.md) 不同；没有为 Socket 命令猜测 HTTP 路径。

## 本阶段的实际请求

| 类型 | 数量 | 结果范围 |
| --- | --- | --- |
| HTTP 业务与媒体请求 | 11 | 当前帖子、分享图、商城状态、AI 页面配置及本人关注吧交叉核对 |
| App Socket 消息 | 52 | 51 个响应；首次缺少原生请求头的初始化被关闭 |
| 不同 Socket 命令 | 10 | 身份初始化、POI、资料、黑名单、提醒设置及吧数据 |
| 握手探测 | 8 | 单独计数，不加到业务请求数；包含同主机 TLS 443 失败探测 |

此前阶段的 38 次扩展请求和 3 次深挖读取保持原记录，没有并入本表。该 App 阶段汇总的 HTTP 候选清单为 603 条 / 568 个路径，其中 45 条 / 41 个路径完成对象或状态核对，176 条仅有匿名诊断。Socket 结果独立列出，没有将它们叠加成 HTTP 接口数量。

完整索引中的 **32 个 Socket 继承类、24 个不同构造整数候选**均列在 [Socket 类清单](../evidence/app-socket-command-inventory.json)，其中 10 个绑定已审核并收到响应；其余逐项保留对象、请求/接收方向或恢复语义的缺项。构造整数和基类不能直接计作可调用 API。

## 十个命令逐项结果

| 命令 | APK 请求类 / 用途 | 实测与边界 |
| --- | --- | --- |
| `1001` | `UpdateClientInfoMessage`，连接初始化 | 无账号的密钥初始化后，在加密帧中加入现有登录态；返回 UID 与本人账号一致。后续以空 BDUSS 清除此 Socket 身份，回查已回到匿名 |
| `303017` | `LocationSocketRequestMessage`，附近 POI | 公共北京坐标 `39.9,116.4` 返回 11 项；`formatted_address` 与地点名称对应北京市，名称、地址、sn 非空。`PoiInfo` 是 name/addr/sn，不回显经纬度 |
| `303006` | `RequestOfficialBarMenuMessage`，官方吧菜单 | 普通吧返回 0、`has_menu=0`、无菜单；仍缺非空官方菜单样本 |
| `303005` | `RequestQueryCollectUpdateNumMessage`，收藏更新数 | 返回 0 和 uint32 计数；只核对字段，没有制造新收藏更新来验证计数增量 |
| `205003` | `RequestQueryUserInfoMessage`，旧 App 用户资料 | 返回受控账号 2 的精确 UID；黑名单和提醒标志明确存在，状态测试均独立回查 |
| `104103` | `RequestGetMaskInfoMessage`，屏蔽列表 | `type=10` 返回非空黑名单，受控 UID 随加入/移出而变化；`type=0`、`type=9` 当前为空，不能外推这些列表功能均通过 |
| `104104` | `RequestCheckUserMaskMessage`，目标屏蔽状态 | 受控对象的状态与黑名单加入、移出及资料标志一致；未将它解释为所有提醒设置的通用读取 |
| `104102` | `RequestUpdateMaskInfoMessage`，修改屏蔽设置 | `type=10` 黑名单、`type=9` 单个会话提醒屏蔽分别验证变化和恢复；响应封装只有 error，无 data |
| `107129` | `RequestGetLivableForumList`，直播选吧中的关注吧列表 | `likeForumFlag=1,pageNo=1,pageSize=2` 返回非空列表；全部返回吧 ID 均在当前本人 HTTP 关注列表中。不代表已经开播或房间流程通过 |
| `208001` | `RequestOfficialBarInfoMessage`，官方吧资料 | 返回 0，portrait 为空，authen 字符串存在；未匹配当前吧头像，只记结构核对 |

黑名单来源为 APK `BlackListModel.addToBlackList/removeFromBlackList`；提醒设置来源为 `PersonalTalkSettingModel.i1`。它们共同使用 `UpdateMaskInfo`，但 type 和被读取的状态字段不同。此前 HTTP `userMuteAdd` 返回高级会员限制，不能将这个限制迁移到此次原生命令上。

## HTTP 与媒体结果

| 路径 | 请求语义 | 观察结果 |
| --- | --- | --- |
| `/c/f/pb/page` | 用户指定帖子 `11185790604` | 两次读取用于当前对象和图片核对；精确帖子编号匹配 |
| `/c/c/img/getShareImg` | 线程 `type=3,thread_id`；吧 `type=2,forum_id` | 两次返回 0 和 img_url；各用同主机 HTTPS 变体下载到 JPEG。未建立图片与指定对象的精确对应，不按整项功能通过计数 |
| `/c/f/shop/getUserKjsStatus` | APK 明确采用的空参数表，带本人登录态 | `210009 系统错误`；原因未定位，不能认定为会员不足或登录失效 |
| `/c/x/aigc/getBdtAigcAnswerStatus` | 普通帖 tid | `210009 系统错误`；普通帖不是有效 AI 答案样本 |
| `/c/f/sprite/getSpriteChatDetail` | `from=default,scene=default,query=''`，带本人登录态 | 0，返回 `guide_info.need_loading` 数值；没有发送对话，也没有验证 AI 回答 |
| `/c/x/sprite/getGuideInfo` | 同类默认页面参数，匿名 | `210009 系统错误`；没有证据区分参数、场景或服务端原因 |
| `/c/f/forum/like` | 本人 uid 和明确分页 | 返回非空关注吧列表，完成 Socket `107129` 返回对象交叉核对 |

分享图原地址是 HTTP。本次只下载同主机 HTTPS 变体，没有声称原 HTTP 传输已验证。首次图片检查在本机因协议保护拒绝，未发送媒体请求；更正后的两次下载计入上述 11 次。

## 传输与密钥恢复

APK Manifest 的 `LCS_SERVER_ADDR` 指向 `ws://im.tieba.baidu.com:8000/`。原生实现提供 `cuid`、`Content-Type: application/octet-stream`、`Sec-WebSocket-Extensions: im_version=2.3`，使用 `chat` 子协议。升级响应的 `Seq-Id` 是有符号 int32 初始序号，不能固定写成 1。

初次通用升级得到 101，但缺少原生头的 `1001` 被服务器关闭；同时补上 cuid 与 extension 后成功。因为同时改了两个条件，未断言具体由哪个头决定。同主机 `wss://im.tieba.baidu.com:443/` 的一次无凭据探测 TCP 接通后 ECONNRESET，未收到 HTTP 响应；这不证明所有 TLS 入口不可用。

WebSocket 二进制消息内部另有 9 字节 App 头：

| 偏移 | 长度 | 含义 |
| --- | --- | --- |
| 0 | 1 | flags：加密 0x80、gzip 0x40、protobuf 0x08、额外数据 0x04 |
| 1 | 4 | 命令，int32 大端 |
| 5 | 4 | 序号，int32 大端，可能为负 |
| 9 | 其余 | 变换后的消息体 |

按 APK `ya`、`c3`、`a3` 等实现恢复：每个连接生成新 32 位小写字母/数字 secret，通过固定 APK RSA-2048 公钥和 PKCS1Padding 包装；PBKDF2-HMAC-SHA1 使用盐 `a40bc834d695f313`、5 次迭代派生 256 位 AES key。编码按“额外数据长度前缀与正文 → gzip → AES-256-ECB/PKCS7”进行，解码逆序。本次服务端响应 flags 为 0x40 或 0xc0，虽然未设置 protobuf 位，正文仍为 protobuf。

实际测试先无账号初始化密钥，再以加密 `1001` 加入 BDUSS，确认本人 UID 后才继续；账号凭据从未明文发送。结束时清回本条 Socket 的匿名身份并断开，未退出浏览器账号。WS 握手本身没有 TLS，不能将此测试写成 TLS 传输验证。

## 帧模块用法

`src/index.mjs` 导出以下纯编解码函数，不会联网、执行认证或修改设置。完整命令字段可离线查询：

```powershell
node scripts/catalog.mjs --socket 104102
node scripts/catalog.mjs --wire UpdateMaskInfo
node scripts/build-app-socket-contracts.mjs
```

在仓库根目录的 `.mjs` 文件中执行以下示例；secret 为公开的合成测试值，不用于真实连接：

```javascript
import {
  deriveAppSocketKey,
  encodeAppSocketFrame,
  decodeAppSocketFrame,
} from './src/index.mjs';

const key = deriveAppSocketKey('0123456789abcdefghijklmnopqrstuv');
try {
  const frame = encodeAppSocketFrame({
    command: 303017,
    sequence: -17,
    payload: Buffer.from('0801120766697874757265', 'hex'),
    key,
    gzip: true,
  });
  const decoded = decodeAppSocketFrame(frame, { key });
  console.log(decoded.command, decoded.sequence, decoded.payload.length);
} finally {
  key.fill(0);
}
```

- `deriveAppSocketKey(secret)` 要求 32 个小写字母/数字，返回 32 字节 Buffer。
- `encodeAppSocketFrame(options)` 要求命令 1–999999、有符号 int32 序号、Buffer 正文；默认 protobuf=true、gzip=false、无 key/extra。提供 key 才加密；extra 为 Buffer 或 null，空 Buffer 仍设置额外数据位。
- `decodeAppSocketFrame(frame, options)` 返回 command、sequence、flags、encrypted、gzip、protobuf、extra、payload；未知标志、缺失密钥、损坏密文/gzip、额外长度越界均抛错，不把它们当空成功。
- `maxBytes` 默认 1048576，范围 9–8388608；同时限制整个帧、解码正文和解压输出。该模块处理 App 内层帧，WebSocket 的升级、掩码和分片需另行实现。

真实认证 App Socket 客户端尚未纳入公共 `TiebaApi`；本次在线会话脚本和用户原始响应留在忽略目录。公开模块和契约可复用，脱敏报告可检查断言，但不能只凭该报告重造私人历史响应。

## 失败保留与尚缺对象

首次黑名单写入、恢复均已收到响应，验证器误以为所有响应必须包含 data，报告 `Missing envelope field`。当次已通过资料和列表回查原状态恢复；离线核对确认两条响应业务码均为 0。修正 error-only 封装后独立复测，成功观察加入和移出。报告保留原失败阶段及修正后的结果，没有将本机解析错误归因于服务端。

仍未完成的项目按原因保留：

- 非空官方菜单、官方聊天历史、AI 机器人和 AI 答案样本尚缺；当前普通帖子或普通 IM 对象不能替代。
- Mercator 请求类能定位，但该 APK 中注册的回调类没有声明方法，尚未恢复完整参数和有效调用点；没有证据判定接口已停用。
- AggregatedRequest 需要有效的子请求 list，尚未恢复完整调度对象；没有发空列表冒充功能验证。
- 表情包同步/收藏会替换完整列表；有效资产格式、基线及精确恢复仍需逐项建立，未发送清空请求。
- 热更新、动态解密、非 Wire RPC、原生二进制逻辑可能还有接口；新增 228 个消息类型不代表新增 228 个可用 API。
- 吧务按用户要求排除；支付、销号缺少隔离对象，沿用 [当前清单](remaining-validation.md) 的逐项原因。

## 离线验证

```powershell
npm.cmd test
java tests/fixtures/AppSocketCryptoFixture.java
node scripts/build-app-socket-contracts.mjs
node scripts/build-current-coverage.mjs
```

Node 测试覆盖固定帧、独立 Java JCE 密钥/密文向量、负序号、gzip/extra、限长及损坏数据，并通过合成 DEX 检查跨命名空间提取、旧模式兼容、缺失文件与来源不匹配。Java 命令仅需复核独立加密向量时执行，普通客户端及 Node 测试不依赖 JDK。离线测试不等于上述在线业务复测。

本次实际检查：`npm.cmd test` 的 91 项 Node 测试、4 项 Python ZIP/CRC 测试和独立 Java 向量均通过。PowerShell 的 `npm.ps1` 被系统执行策略阻止，改用同一安装的 `npm.cmd` 后完成测试，没有修改系统策略。

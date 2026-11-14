# 客户端 API

导入入口为 `src/index.mjs`。当前 `TiebaApi` 提供 10 个读取与 2 个写入方法，返回选定的业务字段或写入确认及 HTTP 元数据；完整 APK 候选和历史写入测试见 [覆盖清单](remaining-validation.md)，不属于此客户端已实现的方法列表。

## 创建客户端

```javascript
import { TiebaApi, TiebaAuth, TiebaApiError } from './src/index.mjs';

const api = new TiebaApi({
  auth: null,
  timeoutMs: 12000,
  maxResponseBytes: 1048576
});
```

`auth` 可设为 `TiebaAuth.fromFile('.local/account.json')`，也可以直接构造 `TiebaAuth`。HTTP 主机固定为 `https://tiebac.baidu.com`，读取采用 POST、Protobuf multipart，写入采用带遗留签名的 POST 表单。构造对象不联网，不自动重试或翻页；每次方法调用至多发起一次 HTTP 请求。

`timeoutMs` 为 1–60000 毫秒，`maxResponseBytes` 为 1–8388608 字节。所有方法支持可选 `signal: AbortSignal`，取消会传递到连接并释放监听器。认证对象表示本机已提供凭据；是否仍处于有效登录态需要相应登录或身份流程核对，不能只靠公开资料读取判断。

## 方法与参数

| 方法 | 必需输入 | 可选输入与默认值 | 对应路径与命令 |
| --- | --- | --- | --- |
| `getForumThreads(name, options)` | `name`：吧名字符串 | `pn=1, rn=20, signal` | `c/f/frs/page`，301001 |
| `getThread(target, options)` | 官方 `/p/<id>` URL 或帖子编号 | `pn=1, rn=20, signal` | `c/f/pb/page`，302001 |
| `getPostReplies(target, postId, options)` | 帖子目标、真实父回复编号 | `pn=1, signal` | `c/f/pb/floor`，302002 |
| `getUserProfile(userId, options)` | 真实用户编号 | `pn=1, rn=1, signal` | `c/u/user/profile`，303012 |
| `searchForums(word, options)` | 发帖目标吧的检索词 | `signal` | `c/f/forum/searchPostForum`，309466 |
| `getLocationSuggestions(address, options)` | 地址名称字符串 | `signal` | `c/s/getSuggestionByAddrName`，303018 |
| `getOwnTails(options)` | 显式 auth | `signal` | `c/u/tail/getTails`，305001 |
| `getOwnPrivacySettings(options)` | 显式 auth，含已确认的本人 uid | `signal` | `c/u/user/getPrivateInfo`，303016 |
| `getAgreeNotifications(options)` | 显式 auth | `cursor="0", rn=20, signal` | `c/u/feed/agreeme`，309593 |
| `getPollingStatus(options)` | 显式 auth | `signal` | `c/s/loop`，309732 |
| `setThreadLike(target, forumId, liked, options)` | 帖子目标、所属吧编号、boolean；auth 含 TBS | `signal` | `c/c/agree/opAgree`，遗留表单 |
| `removeFollower(userId, options)` | 单个粉丝的用户编号；auth 含 TBS | `signal` | `c/c/user/removeFans`，遗留表单 |

编号接受精确的十进制字符串、bigint 或安全整数，范围为正 int64。大于 JavaScript 安全整数的值必须传字符串或 bigint；输入 Number 已经丢失的精度无法恢复。返回的 int64/uint64 编号始终是字符串。

`pn` 是正 int32；`rn` 的客户端输入范围为 1–100。后者是本客户端的输入限制，不是上游实际返回条数的保证。名称和检索词经过首尾去空白后不能为空，原输入最多 256 字符，这是客户端限制。

### 返回字段

每个成功结果都包含 `meta`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `endpoint` | string | 相对业务路径 |
| `command` | number / null | Protobuf 的实际命令号；遗留表单请求为 null |
| `http_status` | number | 当前成功结果要求 200 |
| `error_code` | string | 明确解析的业务成功码 `"0"` |
| `response_sha256` | string | 收到的原始响应体摘要 |
| `response_bytes` | number | 原始响应体字节数 |

业务字段采用协议中的名称：

| 方法 | 选定输出 |
| --- | --- |
| `getForumThreads` | `forum`、`page`、`thread_list` |
| `getThread` | `forum`、`page`、`thread`、`post_list` |
| `getPostReplies` | `page`、父 `post`、`subpost_list` |
| `getUserProfile` | `user` |
| `searchForums` | 可选 `exact_match`、数组 `fuzzy_match` |
| `getLocationSuggestions` | 数组 `poi_info`：坐标字符串 `lat, lng`、`name, sn, distance` |
| `getOwnTails` | 数组 `tailList`、颜色字符串数组 `colorList`、`default_color` |
| `getOwnPrivacySettings` | 本人 `user.user_id`，设置 `location, post, like, group, live, forum_num, reply, follow` |
| `getAgreeNotifications` | `has_more`、数组 `agree_list`：`id, type, time, is_del, thread_info, agreeer, post_info` |
| `getPollingStatus` | `live` 的图标配置与 `is_end`，`level/icon` 的 `pop_key, pop_value` |
| 两项写入 | `acknowledged: true`；表示明确业务码 0，实际状态需另行回查 |

常用子对象：

| 对象 | 字段 |
| --- | --- |
| forum | `id, name` |
| page | `current_page, total_page, has_more, has_prev` |
| thread | `id, title, reply_num, author, author_id, agree` |
| post | `id, title, floor, content, sub_post_number, author_id, author, agree` |
| subpost | `id, content, author_id, floor, author` |
| user / author | `id, name, name_show, has_concerned, is_fans`；状态字段缺失时不补零 |
| agree | `agree_num, has_agree, agree_type, disagree_num`；计数为 int64 字符串 |
| tailList 项 | `tailId, is_selected, tailContent, fontColor, fontKeyName`；tailId 为 uint32 数字 |
| content | `type, text, link` |
| 搜索命中 | `forum_id, forum_name` |

缺失的单值字段保持缺失，不补成零；重复字段缺失时返回空数组。未知字段不进入投影。`User` 中的 BDUSS、密码等字段不在返回白名单中，客户端也不自动保存原始响应。

这是读取常用字段的投影，未覆盖富媒体、链接预览等全部内容结构。客户端会核对请求的帖子、父回复或用户编号；吧列表还核对吧名与页码。楼中楼空首页已实测可返回 `current_page=0, total_page=0`，只在父回复仍匹配且列表为空时接受这一首页形式。

### 新增方法的边界

`getAgreeNotifications` 的 cursor 是包含 0 的 uint64 游标，必须保留精度；q_type 固定为本轮核对的 0。time 沿用协议的 uint32 字段，本轮未独立核对时间单位。隐私设置返回服务端数值，尚未恢复完整枚举，不自行解释为 boolean。地点坐标原样保留为字符串，本轮未独立确认坐标系。小尾巴读取不代表启用权限；先前启用测试仍受会员限制。

`getPollingStatus` 只发送 APK 首页组合 `live,level,icon,festival_info`，投影其中已核对的 live/level/icon 字段，不承担后台定时任务。聊天室消息确认与群聊轮询不在此方法范围。构造该请求需要显式 auth，结构返回不能单独证明账号登录仍有效。

两项写入必须显式提供本地 auth 和非空 TBS。`setThreadLike(..., true)` 编码 op_type=0，false 编码 1；固定 obj_type=3、agree_type=2，只覆盖主帖点赞。通过 `getThread().thread.agree.has_agree` 回查状态（0/1）；forumId 应来自同一帖的 `forum.id`。方法不做自动重试、隐式恢复或额外发布。

`removeFollower` 从当前账号的粉丝中移除指定用户，不是取消当前账号对该用户的关注。通过受控粉丝账号读取当前账号资料的 `has_concerned` 核对；恢复时需粉丝账号重新关注。此方法不调用 `multiRemoveFans`，后者在 APK 中对应“移除全部被封禁粉丝”。

本轮实测和未验证对象见 [新增接口报告](expanded-api-validation.md)。CLI 仍只暴露原有 5 组读取命令，新增 7 个方法从模块调用。

### 调用示例

```javascript
const result = await api.getThread(process.env.TIEBA_TEST_THREAD, { pn: 1, rn: 2 });
for (const post of result.post_list) {
  const text = post.content.map(item => item.text ?? '').join('');
  console.log(post.id, text);
}
```

示例显式打印回复文本；CLI 默认只在本地输出文件中保存这些字段。

## 错误与取消

```javascript
try {
  await api.getThread(process.env.TIEBA_TEST_THREAD);
} catch (error) {
  if (error instanceof TiebaApiError) {
    console.error(error.kind, error.code, error.meta.endpoint);
  } else {
    throw error;
  }
}
```

| `kind` | 含义与典型 `code` |
| --- | --- |
| `transport` | 超时、取消、网络或响应超限；取消为 `ABORT_ERR` |
| `http` | HTTP 非 200，code 为状态码字符串；不自动跟随重定向 |
| `business` | 明确的非零业务码，原样保留 |
| `protocol` | 缺少或歧义业务状态、缺少数据封装、字段类型不符 |
| `object-mismatch` | 返回的对象或受核对分页与请求不符 |

参数校验抛出普通 `Error`，发生在发送前。`TiebaApiError` 提供 `kind`、`code`、`meta`，不会把不受信任的服务端响应文本直接拼进错误消息。失败元数据仅包含已经观察到的部分字段。

HTTP 200 不足以成为成功结果；业务码缺失不会补为 0。业务错误不自动重试，避免把当前请求的拒绝原因覆盖。API 方法不会把空结果、未知错误码一律解释为登录失败、验证码或风控。

## 与 IM 及研究工具的关系

`ImLcpClient` 也从主入口导出，属于低层连接能力，负责 TLS、帧、有界等待、心跳和 `close()`；IM 业务服务号、方法号与实测边界见 [IM 协议说明](im-validation.md)。`TiebaApi` 尚未提供通用发信、群管理、发帖或删除方法。

当前仓库未发布正式版本。以所用提交中的实现与本页约定为准；原有验证脚本入口继续保留，真实账号文件格式没有迁移要求。

## IM 用户身份查询

`getImUserIdentities` 是独立导出的 IM 读取函数，和 12 个 TiebaApi 方法分开；不通过 tiebac 请求，也不发送聊天消息。

```javascript
import fs from 'node:fs';
import { getImUserIdentities } from './src/index.mjs';

// 两个文件均由调用者准备，保存在忽略目录；im-device.json 保存自己的逻辑设备标识。
const account = JSON.parse(fs.readFileSync('.local/account.json', 'utf8').replace(/^\uFEFF/, ''));
const device = JSON.parse(fs.readFileSync('.local/im-device.json', 'utf8').replace(/^\uFEFF/, ''));
const result = await getImUserIdentities({
  BDUSS: account.BDUSS,
  cuid: device.cuid,
  userIds: [account.uid]
});
// result.user_list 含用户资料，按需要保存在本机；避免写入公开日志。
```

| 输入 | 条件 |
| --- | --- |
| BDUSS | 已有本地 BDUSS，不接受空值、换行或分号 |
| cuid | 显式提供逻辑 IM 设备标识，1–256 字符；不会读取系统硬件标识 |
| userIds | 1–20 个不重复的正 int64 编号，字符串/bigint/安全整数；20 是客户端限制 |
| timeoutMs / maxResponseBytes | 默认 12000 毫秒 / 1048576 字节，范围与 TiebaApi 一致 |
| signal | 可选 AbortSignal，实际传递到 HTTP |

固定 POST 到 `https://pim.baidu.com/rest/3.0/im/get_user_info`，签名为 APK 该方法规定的 MD5(BDUSS + Unix 秒)。bd_uids 以精确 JSON 数字发送；解析返回数字时使用 Node.js 24 的 JSON 源值上下文，bd_uid/uk 始终为十进制字符串。每次调用只发一个请求，不重试、不跟随重定向。

成功输出 `{user_list, meta}`，每项选取 `bd_uid, uk` 和可选 `display_name, avatar`。全部请求编号必须恰好返回一次，且 uk 为正 int64；缺少对象、部分成功或未知身份不会默认为可用。错误采用 TiebaApiError 的 transport/http/business/protocol/object-mismatch 分层，不回显凭据和原始响应。

原始请求与函数调用均核对过两个受控账号的 native UID / IM UK。最小请求未发送 account_type/client_id，不承诺其他 SDK 登录类型或任意用户都能查询。该读取结果本身也不替代完整登录态验证。来源与本轮 3 次读取见 [APK 接口清单](network-inventory.md)。

## 原生 App Socket 帧

另提供 `deriveAppSocketKey`、`encodeAppSocketFrame`、`decodeAppSocketFrame`、`APP_SOCKET_FLAGS` 和 `APP_SOCKET_HEADER_BYTES`，用于已恢复的 WebSocket 内层二进制帧。它们不负责联网、认证或状态恢复，也不自动增加 `TiebaApi` 的业务方法。输入、输出、限制和可复现示例见 [Socket 协议](app-socket-validation.md#帧模块用法)。

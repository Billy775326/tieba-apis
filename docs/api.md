# 客户端 API

导入入口为 `src/index.mjs`。当前 `TiebaApi` 提供五类读取，返回选定的业务字段与 HTTP 元数据；完整 APK 候选和历史写入测试见 [覆盖清单](remaining-validation.md)，不属于此客户端已实现的方法列表。

## 创建客户端

```javascript
import { TiebaApi, TiebaAuth, TiebaApiError } from './src/index.mjs';

const api = new TiebaApi({
  auth: null,
  timeoutMs: 12000,
  maxResponseBytes: 1048576
});
```

`auth` 可设为 `TiebaAuth.fromFile('.local/account.json')`，也可以直接构造 `TiebaAuth`。HTTP 主机固定为 `https://tiebac.baidu.com`，采用 POST、Protobuf multipart。构造对象不联网，不自动重试或翻页；每次方法调用至多发起一次 HTTP 请求。

`timeoutMs` 为 1–60000 毫秒，`maxResponseBytes` 为 1–8388608 字节。所有方法支持可选 `signal: AbortSignal`，取消会传递到连接并释放监听器。认证对象表示本机已提供凭据；是否仍处于有效登录态需要相应登录或身份流程核对，不能只靠公开资料读取判断。

## 方法与参数

| 方法 | 必需输入 | 可选输入与默认值 | 对应路径与命令 |
| --- | --- | --- | --- |
| `getForumThreads(name, options)` | `name`：吧名字符串 | `pn=1, rn=20, signal` | `c/f/frs/page`，301001 |
| `getThread(target, options)` | 官方 `/p/<id>` URL 或帖子编号 | `pn=1, rn=20, signal` | `c/f/pb/page`，302001 |
| `getPostReplies(target, postId, options)` | 帖子目标、真实父回复编号 | `pn=1, signal` | `c/f/pb/floor`，302002 |
| `getUserProfile(userId, options)` | 真实用户编号 | `pn=1, rn=1, signal` | `c/u/user/profile`，303012 |
| `searchForums(word, options)` | 发帖目标吧的检索词 | `signal` | `c/f/forum/searchPostForum`，309466 |

编号接受精确的十进制字符串、bigint 或安全整数，范围为正 int64。大于 JavaScript 安全整数的值必须传字符串或 bigint；输入 Number 已经丢失的精度无法恢复。返回的 int64/uint64 编号始终是字符串。

`pn` 是正 int32；`rn` 的客户端输入范围为 1–100。后者是本客户端的输入限制，不是上游实际返回条数的保证。名称和检索词经过首尾去空白后不能为空，原输入最多 256 字符，这是客户端限制。

### 返回字段

每个成功结果都包含 `meta`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `endpoint` | string | 相对业务路径 |
| `command` | number | 实际发送的命令号 |
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

常用子对象：

| 对象 | 字段 |
| --- | --- |
| forum | `id, name` |
| page | `current_page, total_page, has_more, has_prev` |
| thread | `id, title, reply_num, author, author_id` |
| post | `id, title, floor, content, sub_post_number, author_id, author` |
| subpost | `id, content, author_id, floor, author` |
| user / author | `id, name, name_show` |
| content | `type, text, link` |
| 搜索命中 | `forum_id, forum_name` |

缺失的单值字段保持缺失，不补成零；重复字段缺失时返回空数组。未知字段不进入投影。`User` 中的 BDUSS、密码等字段不在返回白名单中，客户端也不自动保存原始响应。

这是读取常用字段的投影，未覆盖富媒体、链接预览等全部内容结构。客户端会核对请求的帖子、父回复或用户编号；吧列表还核对吧名与页码。楼中楼空首页已实测可返回 `current_page=0, total_page=0`，只在父回复仍匹配且列表为空时接受这一首页形式。

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

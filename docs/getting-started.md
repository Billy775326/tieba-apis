# 使用指南

按功能选入口、配置运行环境，再查看输出。本指南先说明当前 PC 工具；后半保留历史 App 客户端的独立配置与模块调用。

## 选择运行入口

| 目标 | 入口 | 结果 |
| --- | --- | --- |
| 查找接口与源码 | `node scripts/catalog.mjs --pc-web 关键词` | 路径、方法、官方脚本位置；离线 |
| 查看接口验收状态 | `node scripts/catalog.mjs --pc-status 关键词` | best_status、最近业务码和证据范围；离线 |
| 复跑网页读取 | `node scripts/verify-pc-web.mjs --live --port 端口` | 固定白名单的脱敏验收报告；联网 |
| 了解点赞、回复或收藏 | [基础功能](pc-web-basic-functions.md) | 已验证取值、前置状态、回查与清理 |
| 了解签到、搜索或发主帖 | [专题说明](pc-web-sign-search-publish.md) | 已验证组合与限制；当前没有一键写入命令 |

## 环境与 PC 配置

需要 Node.js 24+，所有命令在仓库根目录执行，无第三方 npm 运行依赖。Chrome 只用于联网步骤。首次获取见 [README 快速开始](../README.md#快速开始)。

| 项目 | 配置位置 | 行为 |
| --- | --- | --- |
| 登录会话 | 专用 Chrome 配置目录 | 用户在官方网页扫码；Cookie 和令牌不导出 |
| 调试连接 | Chrome 的实际端口及 CLI --port | 仅接受 1–65535 的本机端口 |
| 读取对象 | CLI --thread、--forum | 帖子支持官方 URL 或编号，吧名可选 |
| 输出路径 | 默认 .local 唯一文件，或 CLI --output | 指定路径必须尚不存在 |

PC 工具没有 .env 或账号 JSON 加载入口。下方的 config.example.json 和 accountPath 只属于历史 App CLI，不能控制 PC 浏览器会话。

## PC 离线查询

```powershell
node --version
node scripts/catalog.mjs --pc-web search
node scripts/catalog.mjs --pc-status sign_pc
node scripts/verify-pc-web.mjs --help
```

这些命令不访问贴吧，也不需要账号。源码声明与业务验收是两份结果；更多按场景使用的命令见 [调用示例](pc-web-examples.md)。

## PC 网页读取验收

1. 按 [浏览器准备步骤](pc-web-validation.md#准备浏览器会话) 启动专用 Chrome，使用可见窗口扫码登录。
2. 保持官方首页或论坛页打开。确认实际调试端口；以下示例使用 9222。
3. 在仓库根目录运行：

```powershell
node scripts/verify-pc-web.mjs --live --port 9222 --thread "$env:TIEBA_TEST_THREAD" --forum "$env:TIEBA_TEST_FORUM"
```

现有项目扫码窗口可以继续使用，端口按对应配置目录的 DevToolsActivePort 第一行读取；无需重复登录。指定帖子和[redacted-forum-name]吧是两个独立读取对象。提供 --forum 时执行 11 项业务读取，另做一次网页登录状态检查；未提供时为 10 项。省略 --live 只显示帮助。

## 查看运行结果

终端逐项打印 name、path、status、error_code，结束时给出 output 指向的新 JSON 文件。文件包含：

| 字段 | 内容 |
| --- | --- |
| session | 本次网页登录状态和身份读取 HTTP 状态 |
| writes_executed | false；入口不发帖、不签到、不关注、不删除 |
| results | 每项的路径、方法、HTTP/业务状态、字段名、计数、摘要与对象断言 |
| summary | 本次读取条数、身份读取数及各结果状态计数 |
| failure | 执行失败时的原因摘要 |

业务、HTTP 或对象断言失败退出 1；空结果与仅结构核对单列，不自动解释成权限不足。参数、连接或输出创建失败也会非零退出。缺少明确业务码不会补为 0。

默认文件名唯一；需要固定新路径时可以追加 `--output .local/pc-read-acceptance.json`。该路径已有文件时在连接前拒绝覆盖，应换用新路径或让工具自动命名。Cookie、TBS、防护令牌及原始用户正文不写入报告。完整参数和生命周期约定见 [网页验收指南](pc-web-validation.md#参数与输出)。

## 常见运行问题

| 现象 | 核对与处理 |
| --- | --- |
| 找不到浏览器目标或调试连接超时 | 核对专用 Chrome、实际端口以及官方首页/论坛页；本地连接问题不当作业务拒绝 |
| 提示网页登录 | 在同一专用窗口重新扫码，不从其他浏览器复制凭据 |
| 输出路径已存在 | 改用新路径；不会自动覆盖或追加旧结果 |
| 只查到静态声明 | 再用 --pc-status 查询；源码存在本身不证明可用 |
| 想执行点赞、签到或发帖 | 查对应契约及验收范围；当前公开 CLI 没有这些写入命令 |

## 历史 App 客户端使用

以下说明用于仓库保留的 App Node.js 客户端、CLI 和已有验证工具。SDK 已封装 10 个读取与 2 个写入方法，CLI 保留 5 组读取命令；其他能力的实测记录与业务封装状态分别见 [API](api.md) 和 [覆盖报告](remaining-validation.md)。

## 环境与首次运行

需要 Node.js 24+。在仓库根目录运行，无第三方运行依赖：

```powershell
node --version
node main.mjs --help
node main.mjs status
```

`status` 从提交的脱敏证据读取统计，不请求贴吧。`npm start` 同样默认显示帮助。查询静态路径：

```powershell
node scripts/catalog.mjs pb/floor
```

静态目录返回的是 APK 中的候选字符串，是否可用应查逐项覆盖结果。

## 运行读取命令

联网命令必须显式带 `--live`。以下公开帖子是本阶段实测样本，结果取决于运行时该帖是否仍可访问。

```powershell
node main.mjs forum "$env:TIEBA_TEST_FORUM" --live --pn 1 --rn 2
node main.mjs thread $env:TIEBA_TEST_THREAD --live --pn 1 --rn 2
node main.mjs search-forum "$env:TIEBA_TEST_FORUM" --live
```

楼中楼需要一个真实回复编号，用户资料需要一个已知用户编号；可从上一步输出的 `post_list[].id` 与 `author_id` 取得。在 PowerShell 中赋值后运行：

```powershell
# 将示意值替换为实际读取到的编号。
$postId = '实际回复编号'
$userId = '实际用户编号'
node main.mjs replies [redacted-thread-id] $postId --live --pn 1
node main.mjs profile $userId --live
```

上述赋值是占位示例，不能作为真实编号发送。所有编号用字符串表示。

终端成功摘要形如：

```json
{
  "command": "thread",
  "output": "运行时生成的本地文件路径",
  "error_code": "0",
  "http_status": 200,
  "response_sha256": "响应体的 SHA-256"
}
```

此块是字段示意，完整内容位于 `output` 指向的 JSON 文件。默认目录为 `.local/output/`，文件名含随机运行编号。可用 `--output .local/result.json` 指定新文件；如果已存在则在联网前拒绝执行。

成功进程退出码为 0。参数错误、网络错误、业务拒绝或对象核对失败退出码为 1；请求执行阶段的失败也会写入已经预留的新文件，结构包含 `error` 和可用的 `meta`。输出文件创建失败时不会发出请求。

## 配置文件

首次使用可将根目录 `config.example.json` 另存为 `.local/config.json`。保留已有配置，按需要编辑：

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `timeoutMs` | 12000 | 单次 HTTP 总时限，整数，1–60000 毫秒 |
| `maxResponseBytes` | 1048576 | 响应体上限，整数，1–8388608 字节 |
| `accountPath` | null | 可选本地账号 JSON，不配置时匿名读取 |
| `outputDir` | `output` | 配置文件所在目录下的输出位置 |

相对路径均相对于配置文件所在目录。没有传入配置文件时，默认输出目录为当前工作目录的 `.local/output/`。命令行 `--output` 相对于当前工作目录，不相对于配置文件。

例如 `.local/config.json`：

```json
{
  "timeoutMs": 12000,
  "maxResponseBytes": 1048576,
  "accountPath": "account.json",
  "outputDir": "output"
}
```

随后：

```powershell
node main.mjs thread [redacted-thread-id] --live --config .local/config.json
```

## 复用登录态

`accountPath` 对应现有验证脚本使用的同一账号格式：

| 字段 | 当前读取客户端的要求 |
| --- | --- |
| `BDUSS` | 非空字符串，来自已确认的本地登录态 |
| `tbs` | 可选字符串，不设置时为空 |
| `uid` | 可选的正 int64 十进制编号；本人资料示例及 IM 身份核对需要 |

空白格式在 `examples/account.example.json`，必须先填入本机确认的信息才可用于认证读取。账号文件与原始响应保存在忽略目录；不要把真实凭据放入示例、命令行或 Git。账号对象默认序列化和调试显示只表示已配置凭据，不代表服务端已经确认登录。

此配置加载器不发起扫码登录。已有扫码登录得到的文件可以继续复用；网页登录、App 用户编号和 IM 登录三者的核对过程见 [双账号说明](two-account-validation.md) 与 [IM 报告](im-validation.md)。普通 IM 已通过网页取得的登录态完成真实 LCP 登录，不要求为当前读取客户端安装模拟器。

## 在代码中调用

```javascript
import { TiebaApi, TiebaAuth } from './src/index.mjs';

const auth = TiebaAuth.fromFile('.local/account.json');
const api = new TiebaApi({ auth, timeoutMs: 12000 });
const result = await api.getUserProfile(auth.uid);
console.log(result.meta.error_code);
```

取消单次读取：

```javascript
const controller = new AbortController();
const pending = api.getThread(process.env.TIEBA_TEST_THREAD, { signal: controller.signal });
controller.abort();
await pending; // 以 transport / ABORT_ERR 错误结束。
```

库调用不需要 `--live`，调用方法本身就是明确发出请求的操作。示例模块 [read-thread.mjs](../examples/read-thread.mjs) 与 [read-own-profile.mjs](../examples/read-own-profile.mjs) 仅导出函数，导入时不会自动请求。

## 既有验证工具

这些入口继续可用，输出和前提保持各自文档中的约定：

```powershell
node scripts/verify-app-reads.mjs --live
node scripts/verify-thread.mjs --live --thread $env:TIEBA_TEST_THREAD
node scripts/verify-im-login.mjs --live --account .local/account.json
node scripts/verify-anonymous-boundaries.mjs --live --limit 1
```

其中 `verify-thread.mjs` 的完整参数见 [指定帖报告](thread-validation.md)，匿名边界工具只做空请求诊断。扩展读取还依赖相应协议模型和样本，不能把所有 `verify-*` 当作相同的客户端命令。IM 登录入口只核对本人登录，不发送消息；历史收发与清理范围见 [IM 实测](im-validation.md)。

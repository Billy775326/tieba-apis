# 使用指南

本指南用于当前分支中的 Node.js 客户端、CLI 和已有验证工具。SDK 已封装 10 个读取与 2 个写入方法，CLI 保留 5 组读取命令；其他能力的实测记录与业务封装状态分别见 [API](api.md) 和 [覆盖报告](remaining-validation.md)。

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

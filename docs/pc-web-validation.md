# PC 网页接口验收

当前范围按用户要求收敛为 **PC 网页实际使用或可调用的接口**。不需要安卓手机，不以 App 的成功替代网页验收。本文对应 2026-11-14 的当前页面和前端脚本；统计与原 Android 清单分别维护。

## 结果与证据

已固定四个当前 PC 页面加载的官方脚本：`index.513973fe.js`、`core-common.32cdf0d7.js`、`frs.38cf3183.js`、`home.e098101c.js`。源码 URL、SHA-256、字节大小和 UTF-16 代码单元位置见 [请求清单](../evidence/pc-web-api-catalog.json)。完整源码只存本机；清单提取字面量 url 与紧邻 DataType，不代表发现了所有动态地址或其他页面脚本。

| 指标 | 结果 |
| --- | --- |
| 源码候选 | 84 个路径、86 个路径/方法组合 |
| 业务调用记录 | 70 条，另记录公开脚本的 2 次身份读取；自动资源与后台令牌请求未计入 |
| 已请求源码候选 | 26 个；另有 4 个运行时接受的 GET 方法变体单列 |
| 对象/状态核对 | 7 个：帖子、论坛、用户卡片、本人隐私、吧卡片、关注及取消关注 |
| 结构核对 | 13 个；不代表已验证所有分页、边界或新通知送达 |
| 空结果 | 2 个，缺少非空分支样本 |
| 业务错误 | 4 个，原因尚未隔离 |
| 未验证 | 60 个，其中 6 个吧务候选按原要求排除 |

完整记录与逐项原因见 [JSON](../evidence/pc-web-validation.json) 和 [CSV](pc-web-api-coverage.csv)。统计对象是路径与方法组合，不能与早期 603 条 App 候选、1974 个 Wire 模型或 Socket 命令相加。

## 已核对的关键行为

- `POST /c/f/pb/page_pc` 使用 `kz=11185790604`，返回精确帖子编号；最初误传 `tid` 的失败记录保留。
- `POST /c/f/frs/page_pc` 使用 `kw` 和网页源码的分页/新版标志，返回“雷神加速”吧。
- `GET /c/u/user/getPrivateInfo_pc` 在现有网页登录会话内返回本人 UID，已与既有受控账号核对。
- `GET /c/u/pc/userCard` 按 portrait 查询两个受控账号；返回 portrait 带查询后缀，去除查询部分后的键一致。没有把 PC tieba_uid 当成 App UID。
- `GET /c/f/pc/forumCard` 返回的吧 ID 与请求匹配。
- `POST /c/c/user/follow_pc` 与 `POST /c/c/user/unfollow_pc` 使用官方前端自己的封装，验证未关注 → 已关注 → 未关注；每步回读用户卡片，原关系已恢复。

网页 `getPrivateInfo_pc`、用户卡片和关系操作的证据来自本次网页调用，不是此前 App 同名功能的复用结论。

## 结构核对、空结果与错误

首页左右栏、游戏卡片、发帖配置、本人关注吧、关注/粉丝列表、本人点赞/收藏列表和三类通知返回了业务数据。消息通知没有制造受控新事件，因此只按结构核对，不声称完整收发流程通过。

源码的获赞、提及、回复通知采用 `POST` 并传 `_client_type=20`，历史吧采用 `FORM_DATA`。服务端还接受本轮测试的四个 GET 变体；报告把变体与源码方法分别记录，公开入口现按源码方法调用。

| 路径 | 本轮状态 | 原因边界 |
| --- | --- | --- |
| `/c/f/pc/myForumList` | 空参数首次 210009，补入源码使用的 portrait、分页后返回非空列表 | 参数构造问题已修正，不能将首次系统错误认定为账号受限 |
| `/c/f/frs/threadlist_pc` | 300000 | 尚需核对有效 tab/cursor 等调用语义，不推断为会员或设备限制 |
| `/c/f/frs/generalTabList_pc` | 300000 | 同上，普通 kw 与当前参数不足以完成有效业务验收 |
| `/c/u/feed/myThread` | 210009 | 当前构造失败，参数、对象或服务端原因未隔离 |
| `/c/f/pb/getmypost_pc` | 210009 | 尚未建立有效本人回复定位对象，不能判定接口已失效 |
| `/c/f/forum/gethistoryforum_pc`、`/c/f/pc/iconCard` | 0，但无非空业务对象 | 保留空分支结果，不提升为完整功能通过 |

当前前端 `MsgGuideDialog` 包含引导“打开贴吧App私信 TA”的逻辑，尚未建立 PC 网页原生私信收发入口。之前 IM SDK 的私信和群聊结果不计入本次 PC 验收，也不再为此申请安卓手机；这不等于证明所有历史网页消息入口均不存在。

## 准备浏览器会话

环境需要 Node.js 24+ 和 Chrome。使用专用配置目录，保留当前官方 PC 首页 `https://tieba.baidu.com/` 或论坛页 `/f`；用户在可见窗口中扫码登录。Windows 的一个示例：

```powershell
$chromePath = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$pcProfilePath = Join-Path (Get-Location) '.local/pc-web-browser'
& $chromePath --remote-debugging-port=9222 "--user-data-dir=$pcProfilePath" 'https://tieba.baidu.com/'
```

Chrome 路径按本机安装位置调整。示例只创建专用配置，不覆盖日常 Chrome 数据。已经有本项目扫码窗口时，直接读取其专用目录的 DevToolsActivePort 第一行，无需再次登录。

```powershell
$pcBrowserPort = Get-Content .local/login-browser/DevToolsActivePort -First 1
node scripts/verify-pc-web.mjs --live --port $pcBrowserPort --thread 11185790604 --forum 雷神加速
```

`--port` 只接受 1–65535 的本机调试端口；调试目标必须是官方 HTTPS 贴吧首页或论坛页。原先某些帖子/个人页的调试命令超时，所以入口主动选择可响应的首页或论坛页；本地调试超时不记录为贴吧业务拒绝。

## 参数与输出

| 参数 | 含义 |
| --- | --- |
| `--live` | 显式启用只读联网；否则只显示帮助 |
| `--port` | 已登录 Chrome 的本机调试端口，联网时必填 |
| `--thread` | 官方帖子 URL 或精确编号，默认指定测试帖 |
| `--forum` | 可选的测试吧名；提供后增加一次论坛读取 |
| `--output` | 可选新文件；已有路径在连接浏览器前拒绝覆盖 |

入口按固定白名单执行 10 项读取，提供 forum 时为 11 项；另读取一次当前网页登录状态。`POST` 或 `FORM_DATA` 本身不表示写入，`GET` 也不表示安全只读，白名单按实际业务审查，不允许传任意路径。

输出包含 HTTP/业务状态、字段名、列表长度、对象断言和摘要。摘要基于浏览器 XHR responseText 的 UTF-8 编码，不能当作压缩传输字节的摘要。业务、HTTP 或对象断言失败时进程返回 1；空样本和仅结构核对仍在结果中单列。原始 JSON、Cookie、TBS 和防护令牌保持在网页会话内部；官方模块自己构造请求，不额外导出凭据或伪造防护参数。

网页观察钩子在 finally 中恢复，连接结束会清理本次 CDP 待处理请求和超时器；不关闭浏览器窗口或退出账号。该入口只输出验收元数据，尚不是返回完整业务对象的独立 PC SDK。

## 离线重建与后续资源

```powershell
node scripts/catalog.mjs --pc-web follow_pc
node scripts/catalog.mjs --pc-status page_pc
node scripts/build-pc-web-coverage.mjs
npm.cmd test
```

覆盖 CSV 从已提交报告重建，不需要 APK、账号或联网。源码清单的重新提取需要本机保存的四个对应脚本及 summary.json：

```powershell
node scripts/build-pc-web-catalog.mjs .local/pc-web-sources evidence/pc-web-api-catalog.json
```

清单构建器验证脚本大小与 SHA-256，不执行脚本。未覆盖的动态 URL、其他入口和参数恢复继续作为工程工作，不伪称资源不足。

现有两个网页登录态、指定帖子和测试吧足够继续普通 PC 功能验收。后续只在确实需要时申请：过期后的重新扫码、网页实际支持的图片/视频/投票等内容样本，或可管理的专用网页测试对象；不再要求安卓环境。吧务仍不测，App 专属能力不列为当前 PC 待验收项。

本次最终离线回归为 97 项 Node 测试通过；网页清单与覆盖 CSV 均已重建并核对字节一致。当前通过的离线测试不等于所有 PC 候选业务均通过。

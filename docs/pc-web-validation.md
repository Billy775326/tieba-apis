# PC 网页接口验收

当前范围按用户要求收敛为 **PC 网页实际使用或可调用的接口**。不需要安卓手机，不以 App 的成功替代网页验收。本文保留 2026-11-14 的前端基线，并纳入 2026-11-15（香港时间）的基础功能、签到/搜索/主帖及扩展读写补测；统计与原 Android 清单分别维护。

文档入口见 [全部文档目录](README.md)，最短运行步骤见 [使用指南](getting-started.md)，已验收请求的字段汇总见 [PC API](api.md#pc-已验收请求契约)。

## 结果与证据

已固定四个当前 PC 页面加载的官方脚本：`index.513973fe.js`、`core-common.32cdf0d7.js`、`frs.38cf3183.js`、`home.e098101c.js`。源码 URL、SHA-256、字节大小和 UTF-16 代码单元位置见 [请求清单](../evidence/pc-web-api-catalog.json)。完整源码只存本机；清单提取字面量 url 与紧邻 DataType，不代表发现了所有动态地址或其他页面脚本。

| 指标 | 结果 |
| --- | --- |
| 源码候选 | 84 个路径、86 个路径/方法组合 |
| 业务调用记录 | 430 条：历史 390 条加本轮 40 条独立 HTTP 响应；准备与刷新另计 |
| 独立 HTTP 覆盖 | 17 个组合，与此前执行方式分列；不将全部历史观测当作独立复测 |
| 已请求源码候选 | 82 / 86；运行时 GET 方法变体单列 |
| 对象/状态核对 | 62 个：36 个读取、26 个状态变化；招募等恢复限制单列 |
| 结构核对 | 13 个；不能自动等同完整业务验收 |
| 空分支 | 1 个，通用 tab 尚无非空分支 |
| 业务错误 | 6 个，保存具体输入范围与错误码，不泛化为账号限制 |
| 未请求候选 | 4 个：3 项吧务写入无实际角色、1 项未取得真实广告事件 |

完整记录与逐项原因见 [JSON](../evidence/pc-web-validation.json) 和 [CSV](pc-web-api-coverage.csv)。统计对象是路径与方法组合，不能与早期 603 条 App 候选、1974 个 Wire 模型或 Socket 命令相加。

## 基础功能补测

新增 26 次 PC 业务操作，验证帖子和普通回复点赞/取消、收藏/取消、普通回复及楼中楼的创建回读、删除本人测试内容并回查。状态均恢复，本次新建两条内容已清理；不涉及管理员删他人内容。请求组合与完整功能表见 [PC 基础功能](pc-web-basic-functions.md) 和 [README 功能](../README.md#功能)，证据见 [本轮报告](../evidence/pc-web-basic-functions-validation.json)。

## 签到、搜索与主帖补测

新增 45 条已捕获业务响应，另保留 3 次未捕获业务响应的本地尝试，不把它们解释为服务端拒绝。已完成搜索建议、吧/帖子/吧内/用户/综合搜索的对象核对，新签到及临时关注恢复，并通过官方编辑器创建且删除唯一主帖；删除前验证的主帖与首楼定位均在删除后返回 4。请求组合、初始失败与清理边界见 [专题说明](pc-web-sign-search-publish.md) 和 [脱敏报告](../evidence/pc-web-sign-search-publish-validation.json)。

历史阶段删除后的帖子/首楼回查返回 4，是预期的删除对象不可读分支；读取证明仍保留，当前行的 latest_error_code 则始终对应最近一次记录。

## 扩展读写补测

新增 249 条响应覆盖简介/隐私/黑名单恢复、徽章、移除粉丝、主帖主页展示、GET 取消收藏、双账号通知、图片、智能标题、社区提示、版本切换及预约/招募。**2 项游戏预约及 1 项招募报名/即时资格未恢复**；取消招募两次返回 990000。逐项流程、参数修正和残留状态见 [扩展验收](pc-web-complete-acceptance.md) 与 [新增证据](../evidence/pc-web-complete-acceptance.json)。

## 已核对的关键行为

- `POST /c/f/pb/page_pc` 使用 `kz=[redacted-thread-id]`，返回精确帖子编号；最初误传 `tid` 的失败记录保留。
- `POST /c/f/frs/page_pc` 使用 `kw` 和网页源码的分页/新版标志，返回“[redacted-forum-name]”吧。
- `GET /c/u/user/getPrivateInfo_pc` 在现有网页登录会话内返回本人 UID，已与既有受控账号核对。
- `GET /c/u/pc/userCard` 按 portrait 查询两个受控账号；返回 portrait 带查询后缀，去除查询部分后的键一致。没有把 PC tieba_uid 当成 App UID。
- `GET /c/f/pc/forumCard` 返回的吧 ID 与请求匹配。
- `POST /c/c/user/follow_pc` 与 `POST /c/c/user/unfollow_pc` 使用官方前端自己的封装，验证未关注 → 已关注 → 未关注；每步回读用户卡片，原关系已恢复。

网页 `getPrivateInfo_pc`、用户卡片和关系操作的证据来自本次网页调用，不是此前 App 同名功能的复用结论。

## 结构核对、空结果与错误

源码通知方法为 POST 并传 _client_type=20；运行时 GET 变体另列。双账号已核对三类 GET 新事件及 POST 提及、回复；获赞 POST 与 GET 的结果没有合并提升。本轮普通列表、历史吧、徽章卡片和会话身份已补充对象证据。

threadlist_pc 和 myThread 的原 300000/210009 已通过字段修正排除；generalTabList_pc 改为成功但空 page_data。头像 300003、评分零值 110003、有效图片对象的 picture/list 4444、推荐 210009 和两项吧务原因读取仍有业务错误。评分正向撤回、部分结构级读取及真实广告事件未完成业务验收。完整逐项原因和恢复限制见 [扩展验收的限制表](pc-web-complete-acceptance.md#错误与未验证项)。

当前前端 `MsgGuideDialog` 包含引导“打开贴吧App私信 TA”的逻辑，尚未建立 PC 网页原生私信收发入口。之前 IM SDK 的私信和群聊结果不计入本次 PC 验收，也不再为此申请安卓手机；这不等于证明所有历史网页消息入口均不存在。

## 直接 HTTP 与刷新

当前入口已改为独立签名 fetch，请求禁缓存，每次断言和摘要使用同一份响应；--refresh-session 可在测试前重载专用页面。历史 UI 驱动、前端封装与本轮直接 HTTP 的区别、发帖字段及写后回读见 [直连专题](pc-web-direct-http.md)。

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
node scripts/verify-pc-web.mjs --live --port $pcBrowserPort --thread "$env:TIEBA_TEST_THREAD" --forum "$env:TIEBA_TEST_FORUM"
```

`--port` 只接受 1–65535 的本机调试端口；调试目标必须是官方 HTTPS 贴吧首页或论坛页。原先某些帖子/个人页的调试命令超时，所以入口主动选择可响应的首页或论坛页；本地调试超时不记录为贴吧业务拒绝。

## 参数与输出

| 参数 | 含义 |
| --- | --- |
| `--live` | 显式启用只读联网；否则只显示帮助 |
| `--refresh-session` | 重载当前专用测试页并等待新上下文，再重新取得会话；业务操作不通过 UI |
| `--port` | 已登录 Chrome 的本机调试端口，联网时必填 |
| `--thread` | 官方帖子 URL 或精确编号，默认指定测试帖 |
| `--forum` | 可选的测试吧名；提供后增加一次论坛读取 |
| `--output` | 可选新文件；已有路径在连接浏览器前拒绝覆盖 |

入口按固定白名单执行 10 项读取，提供 forum 时为 11 项；另做 2 次身份/会话准备读取。`POST` 或 `FORM_DATA` 本身不表示写入，`GET` 也不表示安全只读，白名单按实际业务审查，不允许传任意路径。

当前输出 schema_version=2，包含 HTTP/业务状态、字段名、列表长度、同份响应的对象断言与 SHA-256。摘要基于浏览器 fetch 提供的响应体字节，不是压缩传输链路字节。业务、HTTP、新鲜度或对象断言失败时返回 1；空样本和结构级结果单列。独立构造 PC 请求及签名，Cookie、TBS 和防护令牌不导出；会话准备使用直接接口。

当前实现不安装 XHR 观察钩子。finally 删除本次私有会话对象并关闭 CDP 连接；请求有超时与 1 MiB 响应上限，不关闭 Chrome 或退出账号。该入口只输出验收元数据，尚不是返回完整业务对象的独立 PC SDK。

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

现有两个网页登录态、指定帖子和测试吧足够继续普通 PC 功能验收。后续只在确实需要时申请：过期后的重新扫码、网页实际支持的图片/视频/投票等内容样本，或可管理的专用网页测试对象；不再要求安卓环境。吧务正向写入因实际角色不足未执行；App 专属能力不列为当前 PC 待验收项，预约取消的 App 引导作为 PC 限制记录。

当前工具通过 101 项 Node 回归，新增直接 HTTP、签名与缓存回归；该记录与 26 次基础功能线上补测分别保存。离线回归、生成结果一致性和线上业务验收是不同检查，不能据此将全部 PC 候选标为通过。开发与文档变更应按 [检查流程](development.md#代码入口与检查) 重新验证实际影响范围。

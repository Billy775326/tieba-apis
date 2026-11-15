# 当前验证范围与未完成原因

> 历史 App 覆盖汇总：本页只合并固定 APK 范围内的已保存 App 观测，不包含 PC 网页验收。当前网页功能见 [README 功能表](../README.md#功能)，网页结果与限制见 [PC 指南](pc-web-validation.md) 和 [PC CSV](pc-web-api-coverage.csv)。

本页合并该 App 范围的已保存观测，覆盖 **603 条静态候选、568 个不同路径**。45 条候选已有对象或状态变化核对；其余候选不能一概当作失败。已有 HTTP 返回、尚未发出请求、按用户要求不再测的项目分别列出，状态登记不等于实测完成。

逐项结果见 [CSV](current-api-coverage.csv) 和 [JSON](../evidence/current-api-coverage.json)。CSV 同时列出 execution_status、disposition、历史最强证据及最新限制；未执行项目明确保留 not-requested。

## 新增请求契约与 SDK 方法

客户端从 5 个方法扩展到 12 个。本阶段另记录 **38 次请求**，其中移除一个受控粉丝、帖子点赞与取消均经独立读取核对并恢复原状态；轮询只完成首页订阅返回结构核对，商城 IM 列表为空。初次 GetTails 的响应标签解析失败也保留在报告内，修正后已复测。见 [新增接口实测](expanded-api-validation.md) 和 [脱敏证据](../evidence/expanded-api-validation.json)。这些请求不计入下方冻结的历史阶段总数。

## 全 APK 静态扫描与新增读取

完整网络面、Socket 请求与所有 Wire 声明单列在 [APK 接口清单](network-inventory.md)，不把 URL/资源候选和原有 603 条覆盖行直接相加。本阶段另有 3 次读取：两个受控账号的 IM 身份与此前 IM 登录结果一致，公开查询函数复测通过；本人回复通知只完成非空结构核对。见 [脱敏记录](../evidence/deep-discovery-validation.json)。这些结果不表示全部候选均已可调用。

## 原生 Socket 与继续验证

本阶段新增 **63 次业务/媒体请求**：11 次 HTTP 与 52 次 App Socket 消息；另有 8 次握手探测。黑名单、单个会话提醒开关观察到变化且恢复；10 个命令逐项区分对象核对、结构确认、空样本和本地解析失败。Socket 命令没有并入 603 条 HTTP 候选，也没有猜测对应 HTTP 路径。见 [原生 Socket 实测](app-socket-validation.md) 与 [脱敏报告](../evidence/continued-discovery-validation.json)。

## 后续逐项补测

新增 **249 次请求**，其中 203 次为匿名空请求诊断（含 1 次公开入口检查），其余为登录态或明确参数的业务读取、受控小尾巴流程及图片内容对照。详见 [补测记录](supplemental-validation.md) 与 [脱敏证据](../evidence/supplemental-validation.json)。**匿名诊断不能当作业务通过，也不能证明当前账号权限不足。**

| validation_tier | 候选数 |
| --- | --- |
| anonymous-diagnostic-only | 176 |
| business-validation-incomplete | 207 |
| excluded-by-user | 52 |
| functionally-verified | 45 |
| other-origin | 2 |
| web-route-response-recorded | 121 |

## 先前读取计划与状态验证

此前阶段共记录 **402 次请求**，见 [完整报告](../evidence/comprehensive-validation.json)。151 条网页候选去重后 147 次匿名 GET，全部现有协议读取计划 70 项、遗留读取计划 123 项也已执行；另有 7 项检查和有界重试、媒体对照、受控状态闭环及用户新提供测试吧的主帖测试。这里的“计划已执行”不表示每项都使用了完整参数或业务验收通过。

收藏/取消收藏、图片水印和消息屏蔽标志、关注/取消关注贴吧均观察到状态变化并恢复原值。取消关注的即时回查仍为已关注，约 46 秒后的回查恢复；原因未定位，不强称为缓存。隐私 opt=post 的有效请求 val=2 返回读取值 3，状态随后恢复原值；已验证变化/恢复，完整枚举映射仍未完成。最初 val=0 的拒绝作为参数诊断保留。

图片代理的响应包含 app:tiebaclient;type:0; 前缀。解析后得到 406×406 JPEG，并与同一官方缩略图源的当前响应摘要一致；这验证了本次代理传输，不证明原视频或原始分辨率可用。语音仅做了无 voice_md5 的负对照，仍没有有效语音样本。

## 测试主帖的删除限制

按用户链接，在“[redacted-forum-name]”创建一条明确标记的测试主帖，作者、首楼编号、标题和正文标记均匹配。本人删除接口返回 0，随后账号内和匿名的主帖详情均返回 4。

**首楼按编号查询仍返回数据，进一步删除该首楼返回 230890。未通过“所有内容均不可读取”的清理验收，不能声称彻底清除。** 是否为缓存、软删除保留或其他机制尚未确定；没有继续发布新测试内容。具体编号、标记和原始响应保留在本机忽略目录，未提交。

删除本人新帖使用 bawu 命名路径及 delete_my_thread=1，不属于管理员删他人帖测试。用户已明确不测吧务，其他吧务候选列为 excluded-by-user，保留旧观测，不再要求提供吧务账号。

## 已确认的限制与尚未确认的原因

| 场景 | 实际返回或条件 | 结论 |
| --- | --- | --- |
| 用户屏蔽 userMuteAdd | 1990043，明确提示高级会员权限 | 当前账号权限不足；原屏蔽状态未变化 |
| 指定测试吧签到 | 160002，提示此前已签到 | 本轮没有新增签到成功，不是登录失效 |
| 主帖删除后的首楼清理 | 230890，删除贴子失败 | 主帖详情不可访问，但首楼编号查询仍有返回 |
| 文字名称“[redacted-alternate-forum-name]”的读取 | 340001，服务端限制读取 | 未向该吧发帖；实际使用链接对应的“[redacted-forum-name]” |
| 部分会员、活动或配置查询 | 内部/系统/未知错误 | 仅保留业务码，不推断登录失效、封禁或限流 |
| 私信与 SDK 群聊 | 已完成双账号 IM 登录、双向发送和收件历史回读、本人撤回及清理 | 见 [IM 实测](im-validation.md)；不自动验证 HTTP 聊天室和直播群发 |
| 订单、支付、账号数据清空 | 无隔离订单或账号环境 | 未用真实扣款或清空账号来探测 |

本轮没有足够证据证明验证码或风控限制。匿名网页的 HTML、重定向和空正文也不作为客户端 API 功能通过。

## 全部候选的执行状态

| execution_status | 候选数 |
| --- | --- |
| http-response-recorded | 584 |
| not-requested | 19 |

| disposition | 候选数 |
| --- | --- |
| excluded-by-user | 52 |
| outside-production-scope | 2 |
| tested-with-recorded-result | 549 |

尚未发出有效请求的候选均有单独原因及 [APK 构造线索](../evidence/endpoint-reference-summary.json)。索引扫描了独立 JADX 节点枚举中的 626979 个方法，其中 38584 个没有代码；553 条候选有直接字面量引用，50 条未找到。静态引用和字段线索不算线上测试，也不是完整参数语义。

## 限制分类

| 限制分类 | 候选数 | 证据性质 |
| --- | --- | --- |
| already-completed | 1 | observed |
| anonymous-negative-control-only | 176 | observed |
| deleted-thread-first-post-cleanup-rejected | 1 | observed |
| empty-http-response | 13 | observed |
| functional-assertions-incomplete | 112 | observed |
| html-page-confirmed | 85 | observed |
| http-source-https-variant-tested | 2 | observed |
| media-fixture-missing-after-negative-control | 1 | observed |
| membership-required | 2 | observed |
| nonempty-fixture-needed | 29 | observed |
| not-in-requested-scope | 52 | user-request |
| operation-and-restore-plan-needed | 1 | analysis |
| origin-not-selected | 2 | scope |
| page-api-distinction-pending | 3 | analysis |
| partial-deletion-semantics | 2 | observed |
| redirect-observed | 19 | observed |
| request-or-response-construction-needed | 11 | analysis |
| server-error-unresolved | 51 | observed |
| verified-in-recorded-scope | 40 | observed |

observed 表示实际观测，analysis 表示协议、参数、样本或恢复条件仍待建立；user-request 表示用户排除范围，scope 表示未选择的来源。已经具备测试授权，未执行不会写成“未获授权”。具体原因逐项见 CSV。

## 离线重建与复测入口

在仓库根目录执行 node scripts/build-current-coverage.mjs 可从已保存的脱敏报告重建本页、CSV 和当前覆盖 JSON，不联网、不读取账号文件。node scripts/verify-web-routes.mjs --live 执行匿名网页路由分类；协议和遗留读取复测条件见 [历史全量文档](full-coverage.md)，新结果先保存在忽略目录再审核。

后续 [IM 实测](im-validation.md) 和 [脱敏记录](../evidence/im-validation.json) 已补齐普通私信及 SDK 群聊核心流程；相关 REST 路径和 LCP 方法独立于原 603 条字面量计数，未将成功结果迁移给相似命名的 HTTP 路径。

本页保留 [前轮缺口补测](../evidence/gap-validation.json)、[指定帖子](thread-validation.md) 和 [双账号测试](two-account-validation.md) 的历史记录，不静默覆盖旧观测。
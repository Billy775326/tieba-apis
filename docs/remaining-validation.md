# 当前验证范围与未完成原因

本页合并历史覆盖及 2026-11-14 的指定帖、双账号和缺口补测，覆盖全部 **603 条静态候选、568 个不同路径**。按候选计，18 条已有对象或状态变化核对，另外 585 条尚未完成该层级验收。后者包括已有数据或结构返回的接口，不能直接称为不可用。

逐项列表见 [CSV](current-api-coverage.csv)，包括历史状态、最强证据、最近业务码和限制原因；完整尝试来源见 [JSON](../evidence/current-api-coverage.json)。同一路径不同 cmd 不串用验证结果。历史成功和后续失败分别保留，不能用“曾经成功”掩盖最近失败。

## 本轮线上补测

本轮共 37 次请求：25 次面向 APK 候选的读取、10 次受控账号权限设置/回查，以及 2 次错误路径构造诊断。原始响应仅在本机；脱敏观测见 [补测报告](../evidence/gap-validation.json)。

读取结果为：11 项响应结构核对、6 项返回非空 JSON、1 项按编号主题读取功能核对、2 项成功但为空、5 项业务错误。修正本人/测试账号编号、补入 thread_ids 或使用实际吧名后，部分旧错误得以消除。这些是本轮具体请求的结果，不等于所有参数组合均受支持。

账号 1 对账号 2 的 PermissionList.follow/interact/chat 从原值写为测试值，回查确认三个值变化，再全部恢复原值并回查确认；因此验证的是权限写入及恢复。is_black_white 在该过程中保持不变，不能把它直接理解为当前目标是否被屏蔽。没有通过实际私信或关注验证每个权限开关的下游效果。首次同值写入只作为未发生变化的对照保留，未计为状态变化通过。

UserPost 返回了帖子列表，但 author 对象缺少用户编号，本轮不将其升级为身份匹配的功能通过。动态列表只返回分页信息且没有帖子，保留空结果。会员任务和收藏提醒的两次早期同名路径假设不在 APK 路径表内，分别按 /c/e/point/getmembertasklist 和 /c/f/livegroup/getStoreRemindTime 修正后得到响应；错误路径单独保留，不归咎于真实接口。

## 本轮实际被拒绝的请求

| 路径 | 业务码 | 服务端说明 | 已知限制 |
| --- | --- | --- | --- |
| /c/e/member/getVipInfo | 110003 | 内部错误 | 原因未定位；不能把内部/系统错误直接解释为登录失效或会员不足。 |
| /c/f/forum/getForumMangerRights | 2121024 | the checkuser not a manager | 当前账号不是吧务，服务端明确说明。 |
| /c/f/forum/getUserSign | 210009 | 系统错误 | 原因未定位；不能把内部/系统错误直接解释为登录失效或会员不足。 |
| /c/f/widget/getUserTaskInfo | 110003 | 内部错误 | 原因未定位；不能把内部/系统错误直接解释为登录失效或会员不足。 |
| /c/u/user/bigvip | 110001 | 未给出明确原因 | 原因未定位；不能把内部/系统错误直接解释为登录失效或会员不足。 |

本轮没有取得能证明验证码、限流或账号封禁的返回；不能将其他错误归类为风控。表中的“内部错误”“系统错误”只支持服务端未接受当前请求，根因仍待分析。

## 所有候选的剩余限制

下表按候选计数，包含已验证项的适用范围。basis=observed 表示实际响应或核对结果，analysis 表示尚待解决的分析/资源条件，scope 表示本轮没有选择该来源；analysis 不是服务端拒绝的证据。测试授权已经具备，未执行不会笼统归因为未授权。

| 限制分类 | 候选数 | 证据性质 | 原因与范围 |
| --- | --- | --- | --- |
| functional-assertions-incomplete | 99 | observed | 已有业务返回或结构核对，尚未完成该能力的对象、边界或完整流程验收。 |
| im-session-or-target-needed | 22 | analysis | 单聊、群聊或消息请求尚未逐项恢复；两个网页登录态不等于已恢复 IM 会话及送达核对。 |
| isolated-account-or-order-fixture-needed | 15 | analysis | 涉及订单、支付或账号数据操作；没有相应测试订单或隔离账号环境，未用真实扣款或清空数据探测。 |
| media-request-fixture-needed | 4 | analysis | 尚未恢复该媒体地址所需的有效资源标识、请求格式及返回判据。 |
| moderator-fixture-or-protocol-needed | 18 | analysis | 需恢复具体吧务请求，并提供具备相应权限的测试吧和可回收对象；未执行该候选，非服务端拒绝的实测结论。 |
| moderator-role-required | 1 | observed | 服务端明确返回当前查询账号不是吧务；本次账号无法完成该请求。 |
| nonempty-fixture-needed | 36 | observed | 当前样本返回成功但为空，缺少可核对的非空业务对象。 |
| operation-and-restore-plan-needed | 110 | analysis | 已获测试授权；该操作的请求、有效目标或恢复流程尚未建立，不能仅凭路径名执行。 |
| origin-not-selected | 2 | scope | 来源并非已选择的贴吧生产域名，未向其发送本轮请求。 |
| page-api-distinction-pending | 151 | analysis | 仅提取到网页路由，尚未确认是否为业务 API 及其请求。 |
| request-or-response-construction-needed | 65 | analysis | 尚未恢复足够请求信息、有效参数样本或响应判据；尚无证据判定接口失效。 |
| server-error-unresolved | 42 | observed | 当前请求返回业务码 210009；参数、权限、场景或服务端原因尚未区分，不能据此认定登录失效。 |
| telemetry-environment-needed | 20 | analysis | 日志或遥测行为未恢复，缺少独立测试环境，未向生产遥测批量发送数据。 |
| verified-in-recorded-scope | 18 | observed | 已有对象或状态变化核对；仅覆盖报告记录的账号、样本和时间。 |

私信仍需恢复 IM 登录及 uk 映射、普通单聊封装和接收/历史查询；网页扫码不等于已恢复这套协议。当前未向两个账号发送私信。主帖、吧务、媒体/群聊/活动和支付或账号数据相关项目还需各自有效样本、权限或隔离环境，逐项原因在 CSV 中列出，不能把一个帖子替代所有场景。

## 离线重建

在仓库根目录执行 node scripts/build-current-coverage.mjs，读取已保存的脱敏证据，重新生成本页、CSV 和当前覆盖 JSON；该命令不联网，不读取账号文件，不发送真实操作。它保留 [历史全量报告](full-coverage.md) 的计数和原始快照。私信 IM 方法等未落在 603 个静态候选中的新线索，仍单独见 [双账号验证](two-account-validation.md)。

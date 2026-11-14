# 私信与 SDK 群聊接口实测

本页记录 2026-11-14 使用两个受控账号完成的普通私信和 SDK 群聊测试。请求构造来自同一份贴吧 Android 22.13.1.1 APK；实际使用官方 IM 服务及 LCP 长连接，没有运行 Android App。网页登录取得的本机 BDUSS 可用于本轮 IM 登录，因而缺少手机或模拟器并未阻止这些流程完成。

完整时间、响应摘要、对象断言和清理结果见 [脱敏实测报告](../evidence/im-validation.json)；APK 方法 Evidence ID、源码文本摘要及字段标签见 [协议来源](../evidence/im-protocol-summary.json)。这些是新增的 SDK REST 路径和 LCP 方法号，未混入原有 603 条 c/*、mo/* 字面量候选的计数。

## 已验证的流程

| 流程 | 结果与验收条件 |
| --- | --- |
| 两个账号分别登录 IM | 官方 token 引导、TLS 证书、LCP 认证和 IM method=50 均通过；返回 bd_uid 与各自已确认账号一致，两个 uk 不同 |
| IM UK 映射回百度用户编号 | 用各自真实 IM uk 请求 get_baidu_id，返回值与本人 bd_uid 一致 |
| 私信双向发送 | 两个方向各发送一条，method=55 返回 0；收件账号用 method=93 回读编号、标记、from_user、to_user 均匹配 |
| SDK 普通群创建、加入及成员读取 | 创建一个专用测试群；账号 2 通过 join 加入。双方成员回查恰好为这两个账号，bd_uid/uk 与各自 IM 登录结果一致 |
| SDK 群消息双向发送 | 两账号各发送一条，method=65 返回 0；双方回读均匹配新消息编号、标记、发送者及本次 group_id |
| 本人消息撤回 | recall_mode=1 时，两条本人群消息撤回成功；另增加一条新私信立即撤回，收件账号不再读到原消息 |
| 私信精确删除 | 两账号 method=57 均返回 0；回查不再返回本轮三条原私信编号或测试标记 |
| 退出测试群 | 账号 2 先退出并核对只剩创建者，再由创建者退出；最终人数为 0，双方成员查询均返回 52001（不在群中） |

本轮共发送三条私信（其中一条用于立即撤回）及两条群消息。普通双向收发有六组对象核对，不以发送响应的 0 单独认定送达。服务器端收件历史回读已验证；没有验收 Android 界面显示、系统通知展示或实时推送的完整确认流程。

## 实际限制与保留记录

| 请求或对象 | 观察结果 | 解释边界 |
| --- | --- | --- |
| HTTP rest/3.0/im/send_msg | 300757：bjh return err:user status is error；未产生有效消息编号 | 这是 SDK 业务通道的构造诊断；不能据此判断普通私信不可用，后续 LCP 私信已通过 |
| groupchat add_member | 两种标识格式均返回 30602，提示 members 参数错误 | 邀请参数未验证成功，不推断为权限限制；账号 2 随后的自主 join 成功 |
| IM method=57、category=1 | 两账号均返回 607：no authorization! | 本轮群消息精确删除被拒绝；改用已验证的本人撤回完成正文清理 |
| IM method=249、recall_mode=0 | 5：params error | 模式参数诊断；mode=1 已有成功观测 |
| 较早的一条私信回复撤回 | mode=1 返回 1：systerm error；新私信立即撤回成功 | 原因未定位，不能直接写成撤回超时、封禁或风控 |
| 私信清理后的额外记录 | 每个账号仍返回一条 type=22、含 src 字段的记录，无本轮标记且编号不属于原测试消息 | 来源未确认，未将它当作撤回通知，也未删除未确认归属的记录 |
| 测试群元数据 | 人数从 2 变为 0，状态从 0 变为 1；群资料仍可查询 | 两账号退出已通过；状态含义及服务端物理清除未验证 |
| 前轮测试主帖首楼 | 本轮补查仍可匿名按首楼编号读取，主帖详情仍返回 4 | 原有清理限制未解除，见 [当前限制](remaining-validation.md#测试主帖的删除限制) |

本次测试群是 SDK groupchat 普通群。它不能替代 c/c/chatroom、c/f/chat 等 HTTP 聊天室接口所需的 chatroom_id；直播群发、公开聊天室、语音或业务咨询消息也不能由这些结果自动标为通过。吧务仍按用户要求排除。

## 协议要点

| 阶段 | 传输与方法 | 要点 |
| --- | --- | --- |
| LCP 连接引导 | POST https://pim.baidu.com/rest/5.0/generate_lcm_token | app_id=10773430，sdk_version=3460016；ts 为毫秒，签名为 MD5(app_id+cuid+android+ts) |
| TLS 长连接 | common.lcs.baidu.com:443 | 使用引导返回的已审核生产域名并验证证书；LCP 帧头为 6c637001，随后两个大端 uint32 分别表示 meta+body 长度和 meta 长度 |
| LCP 登录与心跳 | service=1，method=1 / 3 | body 为 LcmPb.RpcData；按服务端间隔保持心跳，避免空闲连接断开 |
| 普通 IM 登录 | service=2，method=50 | JSON 中 token 是本机 BDUSS；返回 bd_uid、uk、trigger_id、cookie 等值必须留在本机 |
| 私信 / 群消息 | service=2，method=55 / 65 | 私信用 to_user=对方 IM uk；群消息用本轮 group_id；type=0 文本，content 为 JSON 字符串 |
| 历史回读 | service=2，method=93 | 使用 APK 常量的实际值 msgid_begin、msgid_end；曾误用 begin_msgid/end_msgid 导致参数错误，已更正 |
| 撤回 / 精确删除 | service=2，method=249 / 57 | 仅操作本轮确认编号；撤回使用 mode=1，删除显式 msgid 数组，不使用范围清空 |
| SDK 群 HTTP API | POST https://pim.baidu.com/rest/2.0/im/groupchat | method=create / get_group_info / get_members / join / quit 等；签名为 MD5(秒时间戳+BDUSS+appid)，凭据放官方 Cookie 头 |

IM JSON 的 err_code 与外层 LCP RPC error_code 分开核对。缺失或格式错误的状态不作为成功；有业务码 0 也不等于对象或完整流程验收通过。

Profile 返回的编号或 UK 字段不能未经核对直接充当 IM uk。本轮最终采用各自 IM 登录响应的 uk，并通过自建群成员和 get_baidu_id 独立交叉核对。构造阶段的标识假设只保留为诊断，不升级为身份验证。

## 复现本人 IM 登录

需要 Node.js 24+，在仓库根目录运行。已有本机账号配置需包含 BDUSS 和已确认的本人 uid；不要将真实值写进命令行、聊天或 Git。

```powershell
node scripts/verify-im-login.mjs --live --account .local/account.json
node scripts/verify-im-login.mjs --live --account .local/account-second.json
```

这两个命令已用本轮账号执行通过。脚本只验证本人 IM 登录，不发送消息、不加入群或修改设置；原始引导和登录响应写入唯一命名的忽略文件，因为响应可能含会话 Cookie 和身份数据。它为每次检查建立独立逻辑客户端标识，不声称取得了真实 Android 设备信息。

编解码和签名在 src/im-protocol.mjs，连接生命周期在 src/im-lcp-client.mjs。客户端设置连接/请求超时、帧及解压上限、待处理请求上限和心跳，关闭时拒绝未完成请求并释放连接；写请求不自动重试。本轮写入仍由保存到 .local 的定向脚本执行，不提供任意目标的批量发送 CLI，也未承诺完整 SDK。

```powershell
npm.cmd test
node scripts/build-im-validation.mjs
```

第一条运行包含 IM 回归的 45 项测试。第二条仅离线重建脱敏报告，需要本轮已保存在 .local 的原始证据；新克隆没有这些私有材料，不能重建历史登录态或原始响应。公开报告保留必要摘要和断言，账号、群号、消息编号、标记、正文及会话凭据未提交。

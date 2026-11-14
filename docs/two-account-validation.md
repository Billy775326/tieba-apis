# 双账号关系与设置接口验证

2026-11-14 香港时间 10:12–10:21，以两个由用户控制、已分别扫码的账号执行 16 次线上请求。两个账号的 App 用户编号已与各自官方网页登录 user_id 交叉核对。账号资料、Cookie、TBS、原始响应及本轮脚本均留在本机忽略目录，本文只使用“账号 1”和“账号 2”。

本页保留 10:12–10:21 的历史记录。后续已补齐普通私信及 SDK 群聊双向收发、回读、撤回和清理，见 [IM 实测](im-validation.md)；下列“尚未完成”只描述该历史阶段。

## 已验证结果

| 能力 | 实际接口 | 结果与判据 |
| --- | --- | --- |
| 双向用户资料读取 | c/u/user/profile，cmd 303012 | 8 次业务码均为 0，返回用户编号匹配各自目标 |
| 账号 1 关注账号 2 | c/c/user/follow | 业务码 0；双方资料分别变为已关注、是粉丝 |
| 账号 2 关注账号 1 | c/c/user/follow | 业务码 0；双方资料均变为已关注且是粉丝 |
| 双向取消关注 | c/c/user/unfollow | 两次业务码均为 0，双方资料恢复未关注且不是粉丝 |
| 各自隐私设置读取 | c/u/user/getPrivateInfo，cmd 303016 | 两次业务码均为 0，字段符合协议，返回的 SimpleUser.user_id 与当前账号匹配 |
| 消息屏蔽设置读取 | c/u/user/getMsgMask | 两次业务码均为 0，data 为单字符二进制标志；尚未核对标志含义，不据此宣称私信可用 |
| 私信发送、接收及回复 | 尚未完成请求构造 | 未发送任何私信，未验证送达 |

脱敏时间、业务状态、逐次关系及响应摘要见 [实测报告](../evidence/two-account-validation.json)。本轮开始时两个账号互未关注，结束时也互未关注，没有遗留新增关注关系。未改变隐私设置或消息屏蔽设置。关注产生的通知记录不包含在关系恢复的承诺内。

## 请求与响应要点

关注和取消关注调用的是 APK 中的 c/c/user/follow 与 c/c/user/unfollow，采用现有 legacyForm 按实际发送顺序生成签名，未使用网页 _pc 路径。表单传 BDUSS、_client_type=2、_client_version=22.13.1.1、毫秒时间戳、tbs、目标 uid 和原生 Profile 返回的 portrait。该组合已实测有效，尚未逐项证明哪些字段可以省略。

资料读取的 User.id、has_concerned、is_fans 分别使用 APK 注解的 tag 2、35、91。只有目标编号匹配，且双方关系变化与操作一致，才将关注功能判为通过；不单凭写接口的 HTTP 200 或业务码 0。响应未提供 is_friend 时保留未知，不推断其含义。

GetPrivateInfo 的包装字段与 Profile 不同：data 位于 tag 1，error 位于 tag 2。内部 user 为 SimpleUser，user_id 位于 tag 1。不能沿用其他响应类型的固定标签读取身份。隐私读取只验证返回对象，未通过修改设置检验各开关行为。

## 私信协议现状

本轮继续检查了 APK 内的 IM 实现，静态方法及 Evidence ID 见实测报告。普通聊天的 IMSendMsg.OriginRequestMsgConstructor 在对应分支生成 method=55，包含 to_user、appid、uk、client_identifier、account_type、sdk_version 及内容、消息键等字段；这些属于独立 IM 请求，不能把已验证的贴吧用户编号直接当作 uk。

APK 另有 IMMediaSendMsgHttpRequest，构造 rest/3.0/im/send_msg，并设置联系人、类型、内容和消息键；存在这个 HTTP 方法不代表它就是普通贴吧私信的当前发送通道。BaseHttpRequest.generateSign 按键排序拼接 key=value，再交给其 MD5 方法；这也不等同于贴吧旧版表单签名。

名为 IMSendMsgRequest 的实现实际指向 imsapi/1.0/send_mcast_msg/liveshowhost 或 liveshowuser，用于直播群发，本轮没有调用它。当前网页的 MsgGuideDialog 展示“打开贴吧App私信 TA”，未找到可直接复用的网页收发流程。

尚需恢复普通单聊的 IM 登录及 uk 映射、请求封装与传输、接收或历史查询和送达核对。用户目前提供 APK 和两个网页登录态，本机 ADB 未列出连接设备；设备运行可辅助调查，但不能据此断言无设备就无法完成协议恢复。上述为此前阶段的分析结论。后续已恢复 LCP 并完成实际收发，最新结论见 [IM 实测](im-validation.md)，不能继续以无设备为该链路未完成的原因。

## 复测范围

线上操作使用 .local 内的定向脚本，没有扩充现有匿名读取 CLI 的写权限。复测应先从双方资料保存关系基线，再操作、双向回读并恢复基线；请求失败或结果未知时先回查，避免盲目重试写入。账号文件只在本机读取，不把值放入聊天、命令行或 Git。

本报告独立于 [历史全量覆盖](full-coverage.md)。它补充两条写入路径及两个设置读取接口的观测，不会自动把历史状态表中的其他写入、群聊、吧务或支付候选标为可用。

# 新增接口契约与客户端实测

> 历史 App 研究：本文冻结 App 客户端扩展阶段的 38 次请求与 12 个 SDK 方法。App 点赞和移除粉丝方法不等于 PC 写入 SDK。当前网页功能见 [README 功能表](../README.md#功能)，参数与验收见 [PC 网页指南](pc-web-validation.md)。

本轮基于同一份贴吧 Android 22.13.1.1 APK 继续恢复真实构造逻辑；SDK 方法从 5 个扩展到 12 个，其中包含 10 个读取与 2 个写入。脱敏记录见 [expanded-api-validation.json](../evidence/expanded-api-validation.json)，调用参数见 [客户端 API](api.md)。

## APK 新恢复的构造语义

| 路径 | 构造来源与参数 | 本轮结果 |
| --- | --- | --- |
| c/c/user/removeFans | RemoveFansController.removeFans(long)，fans_uid 指定当前账号的一个粉丝 | 两账号核对关注→被移除→原状态；原生表单与 SDK 各一轮均通过 |
| c/c/agree/opAgree | hod.b(AgreeData)、nj6.b(...)；op_type=0 点赞、1 取消，线程 obj_type=3、agree_type=2 | 指定帖点赞后读取 has_agree 变化，再恢复基线；原生表单与 SDK 各一轮均通过 |
| c/s/loop | PollingReqMessage.encode(boolean)、PollingModel 首页常量；data_type=live,level,icon,festival_info | 明确业务码 0，live 图标配置非空，level/icon 结构返回；未验证聊天室和弹窗触发 |
| c/s/shop/getKjsIMList | c0c.b()，登录条件，没有额外业务参数 | 业务码 0、data 为空；未验证非空商城会话，不加入 SDK |
| c/c/user/multiRemoveFans | v2a 的 CMD_REMOVE_ALL_FORBIDDEN_FANS；d() 不指定用户列表 | 语义为清理全部被封禁粉丝，没有隔离对象，本轮未调用 |

以上路径原先已在静态候选中；新增的是明确请求语义、业务核对与封装，不是新增 5 条 APK 路径。完整反编译源码留在本机，公开证据保留 APK 哈希、类名和源码摘要，读者需自行取得相同 APK 复核。

## 新增 SDK 方法

| 方法 | 与既有证据关系 | 本轮读取或写入观察 |
| --- | --- | --- |
| getLocationSuggestions | 已有请求契约，新增统一封装 | “北京”返回非空 POI，名称与字符串坐标字段通过解析；不把该输入当成测试者位置 |
| getOwnTails | 已有小尾巴流程，新增列表封装 | 默认颜色和列表解码通过；本次无非空小尾巴样本 |
| getOwnPrivacySettings | 已有本人读取，新增封装 | 返回用户编号与本机已确认 uid 一致，设置字段为明确整数 |
| getAgreeNotifications | 已有获赞读取，新增封装 | has_more 与非空通知列表通过字段解析，未发布或打印通知原文 |
| getPollingStatus | 本轮补齐首页订阅构造与响应投影 | 结构核对通过，非全部轮询场景功能验收 |
| setThreadLike | 本轮新增状态核对 | 真实改变及恢复 has_agree；响应只表示服务端确认，客户端不自动回查 |
| removeFollower | 本轮新增状态核对 | 账号 2 移除受控账号 1；由粉丝账号读取关系验证，最后恢复原状态 |

## 请求计数与修正

共记录 **38 次真实请求**：请求构造与状态闭环 14 次、客户端首轮 6 次、修正后读取 6 次、SDK 写入闭环 12 次。SDK 写入闭环同时包含必要的基线读取、受控关注与恢复回查。它们独立于此前冻结报告中的 249 次和 402 次，不能重复相加到历史阶段。

首轮 getOwnTails 返回 200，但客户端误用普通响应标签，报 INVALID_ERROR_ENVELOPE。APK 契约明确该接口 data=1/error=2，与普通接口相反；修正后业务码 0，颜色和列表解析通过。错误作为首轮结果保留，并加入相反标签、身份不匹配、异常业务状态和缺失认证的离线回归测试。

该阶段功能核对从 **42 条候选 / 38 个路径** 增至 **44 条候选 / 40 个路径**。轮询结构核对、商城空列表不会被提升为整项业务通过；当前表中“仅有匿名诊断”的候选由 184 条减至 180 条。更新后的完整分布见 [当前覆盖](remaining-validation.md)。

## 状态恢复与限制

两轮测试均确认受控账号关注关系及帖子的本人点赞状态恢复原值；本轮没有新增帖子、回复、私信或群，也没有调用批量粉丝删除。认证、原始响应、用户编号及通知文本仅保留在忽略目录，公开报告包含摘要和断言。

吧务继续按用户要求排除。支付、销号、聊天室专用对象和会员能力的已有边界保持原记录。新的空数据或结构返回不用于推断账号被封、风控或服务不可用。

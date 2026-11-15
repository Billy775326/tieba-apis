# 项目文档目录

当前交付范围是贴吧 PC 网页接口的提取、查询、定向业务验收与只读验证工具。先按下面的 PC 文档使用；历史 App、APK、IM 和 Socket 材料独立归档，路径保留，不把其成功记录算作网页支持。

## PC 使用与开发

| 文档 | 内容 |
| --- | --- |
| [项目 README](../README.md) | 完整常用功能表、状态、范围与最短命令 |
| [使用指南](getting-started.md) | 离线查询、浏览器准备与只读验收；后半保留 App 用法 |
| [API 契约](api.md) | PC 入口和已核对字段；后半保留 App 模块约定 |
| [基础功能](pc-web-basic-functions.md) | 点赞/取消、普通回复、楼中楼、删除本人内容、收藏/取消的取值与清理 |
| [网页验收指南](pc-web-validation.md) | 来源、统计、失败原因、参数、输出和复测条件 |
| [架构](architecture.md) | PC CDP、网页请求、结果分级和证据流；历史 App 分层 |
| [开发指南](development.md) | 检查、扩展契约、生成器、脱敏与历史提取工具 |
| [验收与资源](acceptance.md) | 已有会话及样本、确需补充的 PC 对象、历史快照验收 |
| [状态操作范围](stateful-test-plan.md) | 当前 PC 恢复/清理判据与历史 App 限制 |
| [变更日志](../CHANGELOG.md) | 已进入待发布代码的用户变化；未自动发版 |

## PC 证据与状态

| 文件 | 统计对象与作用 |
| --- | --- |
| [源码清单](../evidence/pc-web-api-catalog.json) | 四个固定官方脚本的 URL、大小、SHA-256 和字面量位置；84 路径、86 路径/方法候选 |
| [累计验收报告](../evidence/pc-web-validation.json) | 96 条业务调用；另列 2 次身份读取与额外运行时 GET 变体 |
| [基础功能报告](../evidence/pc-web-basic-functions-validation.json) | 上述累计记录中的 26 次操作，不额外加到 96 上 |
| [PC 覆盖 CSV](pc-web-api-coverage.csv) | 86 个候选的状态及原因；32 个已请求、14 个对象/状态核对，余者分别列示 |

源码候选不等于业务方法数量；同一路径可有多个方法或多个功能。HTTP 返回、明确业务码、非空结构、对象核对、状态恢复与清理分别判断。当前公开 PC 入口只执行读取，定向写入实测不代表已有通用 PC 写入 SDK。PC 私信和群聊尚未建立原生收发入口，不能用历史 IM 结果补齐。

## 历史 App 与 APK 研究

以下文档保留原观察日期、样本、错误和清理边界。603 条 App 字符串候选、全 APK 的 3690 个 URL/路径形态、1974 个 Wire 消息和 PC 86 个候选不相加。

| 文档 | 阶段或内容 |
| --- | --- |
| [调查进展](investigation.md) | APK 来源、工具环境与证据边界 |
| [首批读取](validation.md) | 五类 App 读取及空请求对照 |
| [指定帖子](thread-validation.md) | App 帖子读取、本人回复与楼中楼验证 |
| [双账号](two-account-validation.md) | App 关系、身份和设置的早期记录 |
| [全量候选](full-coverage.md) | 固定提取范围的登记及历史请求统计 |
| [后续补测](supplemental-validation.md) | 冻结的 249 次请求与当时覆盖层级 |
| [App 覆盖汇总](remaining-validation.md) | 603 候选的后续最强证据及未完成原因 |
| [扩展客户端](expanded-api-validation.md) | 38 次请求与 12 个 App SDK 方法 |
| [APK 网络面](network-inventory.md) | 全归档、方法引用、Wire 和 Socket 线索 |
| [首批请求字段](request-fields.md) | 11 个 App 模型、345 个注解字段；生成文件 |
| [私信与 SDK 群聊](im-validation.md) | App/SDK IM 双向收发、身份、撤回及清理 |
| [App Socket](app-socket-validation.md) | 63 次业务/媒体请求、独立握手与命令边界 |
| [历史初始覆盖 CSV](api-coverage.csv) | 早期候选分类快照 |
| [后续 App 覆盖 CSV](current-api-coverage.csv) | App 汇总生成结果，不含 PC 清单 |

生成文件的输入和重建命令见 [开发指南](development.md#pc-证据与生成文件)。新克隆只能重建公开证据支持的产物，不能据脱敏摘要伪造私人原始响应或声称完成线上复测。

# APK 网络接口与消息声明清单

> 历史 App 研究：本文只描述固定 APK 的静态网络面与协议元数据。3690 个 URL/路径形态、603 条旧覆盖候选与 PC 清单的 86 个路径/方法组合分别计数。当前网页功能见 [README 功能表](../README.md#功能)，参数与验收见 [PC 网页指南](pc-web-validation.md)。

本页面向继续分析或调用贴吧接口的开发者，覆盖固定的 Android 22.13.1.1 APK。已完成该包所有归档条目、DEX 字符串表和 JADX 方法的静态扫描，并补齐全部 Wire 注解消息。**静态候选不是可用接口数量；全部运行时接口及全部业务验收仍未完成。** 构造、响应和对象核对分别保存，完整 APK 和原始字符串留在忽略目录。

## 本轮实际覆盖

| 范围 | 扫描结果 | 含义 |
| --- | --- | --- |
| APK ZIP 文件条目 | 10941 个，解压总量 194336378 字节 | 逐项读取并校验 CRC，覆盖 DEX、assets、资源和原生库，不执行目标内容 |
| DEX | 13 个 | 与既有证据逐文件核对 SHA-256，读取完整 string_ids 表 |
| JADX 类与方法 | 105903 个类、626979 个方法，失败 0 | 方法全部检查；只保留请求、网络调用、模型构造或命中路径的记录 |
| URL/路径形态 | 3690 条 | 800 条绝对 HTTP/HTTPS/WS/WSS URL 形态、2890 条相对路径形态 |
| API 形态候选 | 794 条 | 仅路径前缀形态判断，包含 SDK、账号和第三方组件，不代表都属于贴吧业务 |
| 资源与网页形态 | 178 / 73 条 | 不能当成客户端业务 API |
| 方法引用 | 3368 条候选有引用，347 条处于网络上下文 | 共 6819 处直接字符串引用；同方法出现不等于 URL 参数已绑定 |
| 请求类与统一请求数据实现 | 309 个 | 包括 32 个 Socket 继承类与 3 个 INetRequestData 实现 |
| Wire 消息与字段 | 1974 类、12195 个字段 | 导出全部带 ProtoField 注解的类型，不局限于已有请求计划 |
| 请求封装声明 | 145 个，按名称配对响应 144 个 | ReqIdl/ResIdl 名称配对，不自动赋予端点或命令 |

与旧清单相比，API 形态路径中另有 **177 个不同路径**未出现在原有 568 个路径中，其中包含 IM REST、百度账号和第三方 SDK。两套清单的统计单位与范围不同，不能直接相加。原有 603 条业务候选和 45 条功能核对记录保留在 [当前覆盖](remaining-validation.md)。本轮新验证的 IM 身份查询单列记录，不挪入旧路径数量。

首次 Wire 扫描只覆盖 `tbclient` 的 1746 类、10791 个字段；继续扫描补入 228 类、1404 个字段，当前覆盖整份 APK 中带 Wire ProtoField 注解的类。新增 19 个 ReqIdl 封装，不能把新增模型数当成新增接口数。JADX 的“失败 0”指指令索引解码；不表示所有高层 Java 反编译均无错误。

## 去哪里查

| 文件 | 用途 |
| --- | --- |
| [network-surface.json](../evidence/network-surface.json) | 全部归一化候选、作用域、组件、归档清单及字面量/方法来源 |
| [network-call-index.json](../evidence/network-call-index.json) | 请求继承根、构造整数、模型 builder、静态 URL 字段与网络调用 |
| [wire-messages.json](../evidence/wire-messages.json) | 全部 Wire 消息的 tag、类型、重复字段与嵌套描述符 |
| [wire-request-inventory.json](../evidence/wire-request-inventory.json) | 全部请求封装及请求/响应数据字段，未绑定的地址和命令显式为 null |
| [app-socket-command-inventory.json](../evidence/app-socket-command-inventory.json) | 32 个 Socket 继承类、24 个构造整数候选及逐项验证缺项 |
| [app-socket-contracts.json](../evidence/app-socket-contracts.json) | 已人工核对的 10 个命令、请求/响应标签、帧和密钥契约 |
| [continued-discovery-validation.json](../evidence/continued-discovery-validation.json) | 后续 63 次业务/媒体请求、握手探测、状态恢复和失败记录 |
| [deep-discovery-validation.json](../evidence/deep-discovery-validation.json) | 本轮 3 次真实读取、源码摘要及核对断言 |

公开 URL 形态去除查询值、userinfo 和 fragment，遮蔽长数字、长十六进制和不透明路径段；查询键也经过限制。形态合并可能把不同具体 URL 归并，原字符串摘要用于区分来源。归档 byte_offset 是原条目内字节偏移；DEX instruction_code_unit_offset 是方法代码单元偏移。字符串内部偏移在 literal_offset_basis 中注明单位，解码过转义斜杠的字符串不冒充原始字节位置。

在仓库根目录离线检索，不读取账号、不联网：

```powershell
node scripts/catalog.mjs --surface rest/3.0/im
node scripts/catalog.mjs --bindings 303017
node scripts/catalog.mjs --socket 104102
node scripts/catalog.mjs --calls IMGetUserIdentityRequest
node scripts/catalog.mjs --requests ReplyMe
node scripts/catalog.mjs --wire GetPoisByLocation
node scripts/catalog.mjs pb/floor
```

新模式不带查询词时仅输出摘要；最后一条保留旧用法。JSON 数据量较大，按关键词查询更适合阅读。

## 新恢复的请求与读取

| 对象 | APK 构造证据 | 本轮状态 |
| --- | --- | --- |
| IM get_user_info | IMGetUserIdentityRequest.getRequestParameter：bd_uids，MD5(BDUSS + Unix 秒)，固定 PIM 主机 | 原始请求和公开函数各一次；两个受控账号的 bd_uid 与 IM uk 均匹配先前 IM 登录证据 |
| 本人回复通知 | iyb.encodeSocketRequestData 与 ReplyMeNetModel：c/u/feed/replyme，303007，scr_dip 为 DOUBLE | 一次读取返回业务码 0，page 和非空 reply_list 按字段解码；没有发布新回复来生成受控通知 |
| 附近 POI | LocationSocketRequestMessage：303017；lat=1、lng=2、common=3 | 原生 Socket 已验证返回非空北京 POI；没有猜造 HTTP 地址 |
| 官方吧菜单 | RequestOfficialBarMenuMessage：303006；forum_id、update_time | Socket 返回成功但普通吧 has_menu=0；仍缺非空官方菜单对象 |
| 收藏更新计数 | RequestQueryCollectUpdateNumMessage：303005；collect_mark=1 | Socket 返回业务码 0 和整数计数；尚未生成受控收藏更新 |
| 咨询会话与统一聊天配置 | IMConsultGetDialogueIdRequest / AggregatedRequest | 分别需要合法 resource_ids/business_type 或 list 子请求；缺少完整业务对象和参数构造，本轮未发送空请求冒充验证 |

后续 Socket 验证已新增两个可恢复设置流程，见 [Socket 实测](app-socket-validation.md)；上表最初的 3 次读取仍单独保留。账号、IM UK、设备标识、用户资料和通知原文只存本机。IM 最小请求没有发送 account_type/client_id；成功仅覆盖两份 BDUSS 账号，不扩展为其他登录模式已验证。

新增公共函数 `getImUserIdentities` 的输入、输出、错误与示例见 [API 文档](api.md#im-用户身份查询)。它不依赖安卓设备，不需要重新扫码；需要调用者已有有效的本地 BDUSS 和逻辑设备标识。JSON 数字编号保持精确十进制字符串，避免先转 Number 后丢失精度。

## 复现静态清单

使用同一哈希的 APK 与 DEX，Node.js 24+、Python 3.11+、完整 JDK，以及 [开发指南](development.md#apk-静态分析环境) 中固定 SHA-256 的 JADX JAR。Python 工具只用标准库。先按原流程提取 DEX，然后在仓库根目录执行；apkPath 为示例输入：

```powershell
$apkPath = 'D:\targets\example.apk'
python scripts/scan-apk-strings.py $apkPath evidence/endpoint-candidates.json .local/apk-network-strings.jsonl
node scripts/build-network-surface.mjs evidence/endpoint-candidates.json .local/dex .local/apk-network-strings.jsonl .local/network-surface.json .local/network-literal-map.json
java -Xmx4096m --class-path .local/jadx-complete.jar scripts/IndexNetworkCalls.java $apkPath .local/network-literal-map.json .local/network-call-sites.jsonl
node scripts/build-network-index.mjs .local/network-surface.json .local/network-call-sites.jsonl evidence/network-surface.json evidence/network-call-index.json
node scripts/request-models.mjs .local/dex .local/all-apk-wire-models.json evidence/endpoint-candidates.json --all-wire-models
node scripts/build-wire-inventory.mjs .local/all-apk-wire-models.json evidence/endpoint-candidates.json evidence/wire-messages.json evidence/wire-request-inventory.json
```

归档扫描单条目上限 128 MiB、总量上限 1 GiB；超限、CRC 错误或身份不符会失败，不生成“完整”尾部清单。DEX 或方法索引不完整时构建器拒绝生成完成报告。换 APK 需要另建证据基线，不能与此包的标签、命令和实测混用。

验证工具：

```powershell
npm test
python -m unittest discover -s tests -p test_apk_strings.py
node scripts/build-current-coverage.mjs
```

## 尚未完成的范围

| 情况 | 实际边界和下一项工作 |
| --- | --- |
| 动态地址、加密字符串、热修复或下载代码 | 当前只拥有这份 APK；还需恢复具体拼接/解密逻辑或取得运行时证据，不能宣布已找到全部线上端点 |
| 原生库与资源 | 已扫 ASCII 和 UTF-16 ASCII URL；字符串命中不是原生调用行为，Unicode 组件及任意二进制编码仍可能遗漏 |
| Socket、非 Wire 的 SDK/RPC | 已列出命令和构造位置；还需逐项恢复传输和非 Wire 参数，不能把 HTTP 空返回当成验证 |
| 相对路径与方法共现 | 需要继续确认主机、参数实参和调用条件；network_context 不是这些信息的替代品 |
| SDK、广告和账号组件 | 静态纳入便于查找来源；它们不能自动算作贴吧帖子/用户业务，也没有向第三方服务批量发送登录态 |
| 有状态接口 | 逐项建立受控对象、基线和恢复步骤；已有群聊与私信结果见 [IM 报告](im-validation.md) |
| 吧务、支付和销号 | 吧务按用户要求排除；支付/销号缺隔离对象，维持既有记录 |

这些是证据或分析工作的缺项；除非已有明确业务错误，不将它们解释为服务器限流、封禁、账号权限不足或接口失效。

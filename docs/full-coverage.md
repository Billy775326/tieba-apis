# 全量候选覆盖与扩展验证

本次已对当前静态提取范围内的每条候选建立状态记录，尚未完成全部接口的线上功能验收。该范围是 APK 的 DEX 字符串中以 `c/<字母>/`、`mo/<字母>/` 开头的路径，不包含尚未恢复的动态拼接地址或 native 内部地址。

原先的 423 条只覆盖部分前缀；扩展后为 603 条字符串候选、568 个不同路径，包含 H5、媒体、遥测、账号及写入操作。路径数量不是业务 API 数量。

## 实际验证范围

以下数字来自保存的 2026-11-13 观测，不是本次文档更新后的在线复测。累计实际请求过 195 个不同路径，其中 105 个至少一次返回非空业务数据。该统计合并原五类验证、71 个协议读取用例和 123 个带签名的遗留读取用例，按路径去重；命令变体、参数假设与重复对照仍在原报告中保留。

- 原五类匿名读取已核对业务码与返回对象，见 [首批功能验证](validation.md)。
- 协议扩展用例：38 个返回符合已提取字段结构的非空数据，11 个成功但数据为空，19 个业务错误，3 个未确认。结构匹配不等于所有功能语义已验收。
- 带旧版签名的遗留读取：63 个返回非空 JSON 数据，25 个成功但数据为空，30 个业务错误，5 个非 JSON。这里只确认状态和载荷存在，尚未为所有结果建立完整响应模型。

签名从 APK 的 `NetWork.addSign()`、`xa.c()`、`xa.d()` 恢复：按发送参数对的顺序拼接 `name=value`，追加固定串并进行 UTF-8 MD5。辅助函数将排序后的参数按同一顺序签名并发送；这不代表 App 在所有场景都按字母排序。可选 `sig` 分支仍未恢复。未签名对照与带签名复测分别保留，避免把签名缺失误报成接口失效。

最新补测后的逐项状态与限制原因见 [当前验证范围](remaining-validation.md)；本页继续保留历史统计，不代表补测后的当前总表。

## 查询每项状态

- [完整 CSV](api-coverage.csv)：每条候选的路径、命令变体、类别、状态、协议关联和对应报告。
- [覆盖 JSON](../evidence/api-coverage.json)：额外保留 DEX 来源位置、推断边界及各次尝试。
- [协议读取结果](../evidence/broad-read-validation.json)、[遗留签名结果](../evidence/legacy-signed-validation.json)、[补充读取结果](../evidence/legacy-additional-validation.json)、[未签名对照](../evidence/legacy-unsigned-validation.json)。
- [请求类索引](../evidence/request-command-index.json)、[协议契约](../evidence/protocol-contracts.json)、[签名来源](../evidence/legacy-signature-chain.json)。

分类和按名称关联模型属于研究线索。例如不同路径末尾都叫 search，不代表使用相同协议；已明确取消表情搜索与吧务搜索的同名自动关联。业务错误可能来自参数、权限、场景或接口变化，不能统一归为不可用。空结果也不能升格为功能通过。

## 覆盖状态如何解读

下表计数单位是 **603 条字符串候选**，不是独立路径或请求次数；同一路径的命令变体、带主机或不带主机的字符串可分别占一项。报告用例数与表中候选数不能直接相加。覆盖表保留较强的已有证据，历次尝试仍在 attempts 中，因此汇总状态也不代表实时可用性。

| 状态                               | 候选数 | 含义                                                          |
| ---------------------------------- | ------ | ------------------------------------------------------------- |
| `verified-read`                    | 8      | 对应首批五类能力，业务状态和返回对象已核对                    |
| `response-schema-validated`        | 38     | 返回非空 Protobuf，已匹配提取的响应字段结构，尚非完整功能验收 |
| `json-data-returned`               | 62     | JSON 业务码成功且有非空载荷，尚未为每项建立完整响应契约       |
| `accepted-empty-response`          | 36     | 业务码成功，但当前样本为空，不能据此确认功能有效              |
| `business-error`                   | 47     | 当前请求返回业务错误，需继续区分参数、权限及场景              |
| `not-verified`                     | 2      | 当前构造或解码未通过                                          |
| `non-json-response`                | 5      | JSON 假设下收到其他格式，协议仍需确认                         |
| `unrecognized-business-status`     | 1      | 尚未识别预期业务状态                                          |
| `needs-request-construction`       | 75     | 尚未恢复足够的请求或行为信息                                  |
| `not-executed-stateful`            | 152    | 未执行状态操作，需受控测试对象或环境                          |
| `needs-page-or-API-review`         | 151    | web 路由候选，尚需区分页面和业务接口                          |
| `needs-telemetry-test-environment` | 20     | 需独立遥测测试环境或进一步行为确认                            |
| `needs-media-fixture`              | 4      | 缺少有效媒体样本                                              |
| `excluded-origin`                  | 2      | 非生产或其他来源地址，未向该来源发请求                        |

## 登录与未完成范围

用户已通过独立官方 Chrome 窗口扫码，网页登录标志确认成功。所需 Cookie 仅保存在本机 `.local/account.json`，原始用户资料和响应仅保存在忽略目录，未提交。

扩展请求中的 `credentials_supplied` 只表示请求携带了本地登录态，不证明每个 App 接口接受该身份。历史扩展读取中的部分账号请求仍失败。2026-11-14 定向补测已将 PbPage 当前用户编号与网页登录 user_id 匹配，并完成特定帖的回复及清理验证，见 [指定帖子验证](thread-validation.md)；这不等于所有客户端登录条件均已满足。

上述数字仅描述历史快照。后续已完成指定帖回复、楼中楼、双账号关注，以及收藏、图片水印、消息开关、吧关注和本人主帖测试；网页候选也已执行匿名路由分类。本人主帖详情删除后首楼仍可按编号读取，不能将该清理结果与此前两条回复的回查通过混为一谈。最新逐项状态、未执行原因、用户排除的吧务范围及删除限制见 [当前验证范围](remaining-validation.md)。支付、账号安全和私信完整链路仍未验证。

测试吧和两个受控账号现已具备。剩余工作包括尚未恢复的请求与 IM 链路，以及有效的群聊、语音、房间、活动、主题、订单或会员场景样本；支付和账号数据操作仍缺少隔离环境。因此没有将全量任务标成完成。

## 重建与复测

以下步骤以仓库根目录为执行位置，针对同一份已记录 SHA-256 的 APK。更换 APK 时应建立独立证据，不要把本次线上报告或旧命令索引拼到新 APK 下。本次使用 Node.js 24.16.0、完整 JDK 25.0.1、已校验的 JADX 0.7.1，安装入口见 [README](../README.md#rea-分析入口)。

### 准备静态模型和命令索引

先提取 DEX，再生成全部 tbclient 模型；不能在空 `.local/dex` 目录上直接执行模型分析。APK 路径是示例：

```powershell
$apkPath = 'D:/targets/example.apk'
.\scripts\discover.ps1 -Apk $apkPath
node scripts/request-models.mjs .local/dex .local/all-protocol-models.json evidence/endpoint-candidates.json --all-models
java -Xmx3g -cp .local/jadx-complete.jar scripts/IndexRequestCommands.java $apkPath .local/request-commands.json
```

请求类索引仅覆盖直接继承 NetMessage 的类，不跨控制流分支传播寄存器值。本次检查了 121 个类，118 个产生模型或命令线索，116 个命名空间形成契约。JADX 直接索引不是 REA Evidence；独立反编译的三个命令锚点已用于交叉核对。

覆盖生成器读取 `evidence/request-command-index.json`，不是刚生成的 `.local/request-commands.json`。只有确认新输出与当前 APK 身份和既有证据一致后，才更新被跟踪的索引，再重建覆盖：

```powershell
Copy-Item -LiteralPath .local/request-commands.json -Destination evidence/request-command-index.json
node scripts/build-api-coverage.mjs
```

这会更新被跟踪的证据；应在任务分支审核实际差异。覆盖 JSON 会读取已保存的线上报告，不会自己发送请求，也不会将刚产生的 `.local/` 结果自动发布为新证据。CSV 是本次快照，不由该命令重建。

### 准备公开样本与可选登录态

新工作区没有原始公开样本；扩展脚本依赖首批脚本写出的 `.local/frs-page1-response.bin` 和 `.local/pb-page-response.bin`。需要重新产生样本时才运行：

```powershell
node scripts/verify-app-reads.mjs --live
```

已有本机登录配置时，可通过 `--account` 指向该 JSON 文件；当前脚本使用其中的 BDUSS，并可使用已确认的本人 uid。文件不进入 Git，也不应把真实值写到命令行或聊天里。没有配置时可省略 `--account` 做匿名尝试，但不能将其结果声称为已登录复测。

本轮完整读取计划、151 条网页分类及新增写入观测见 [当前验证范围](remaining-validation.md)。用户已排除吧务测试；同名 bawu 删除路径用于本人新帖清理不代表验证管理员权限。

### 按需复测扩展读取

以下命令会向真实服务发请求，无变化时不要重复全量运行：

```powershell
node scripts/verify-reviewed-reads.mjs --live --account .local/account.json
node scripts/verify-legacy-reads.mjs --live --account .local/account.json --signed
node scripts/verify-legacy-reads.mjs --live --account .local/account.json --signed --additional
```

协议用例写入 `.local/broad-read-validation.json`，带签名的主列表和补充列表分别写入 `.local/legacy-signed-validation.json`、`.local/legacy-additional-validation.json`。原始响应也只保存在 `.local/`。执行采用单并发、每次请求后至少间隔 250 ms，默认总超时 12 秒、响应上限 1 MiB。

未签名对照应单独运行并保存，不要混同带签名报告。新结果须核对状态、敏感信息和证据来源后再决定是否更新 `evidence/`；现有报告不会因运行脚本而自动刷新。

本地离线检查：

```powershell
node --test tests/*.test.mjs
```

本页历史覆盖计数没有因定向补测而重算；补测单独保存，不修改正式版本或创建发布标签。

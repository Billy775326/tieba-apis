# 全量候选覆盖与扩展验证

本次已对当前静态提取范围内的每条候选建立状态记录，尚未完成全部接口的线上功能验收。该范围是 APK 的 DEX 字符串中以 `c/<字母>/`、`mo/<字母>/` 开头的路径，不包含尚未恢复的动态拼接地址或 native 内部地址。

原先的 423 条只覆盖部分前缀；扩展后为 603 条字符串候选、568 个不同路径，包含 H5、媒体、遥测、账号及写入操作。路径数量不是业务 API 数量。

## 实际验证范围

截至本次记录，累计实际请求过 195 个不同路径，其中 105 个至少一次返回非空业务数据。该统计合并原五类验证、71 个协议读取用例和 123 个带签名的遗留读取用例，按路径去重；命令变体、参数假设与重复对照仍在原报告中保留。

- 原五类匿名读取已核对业务码与返回对象，见 [首批功能验证](validation.md)。
- 协议扩展用例：38 个返回符合已提取字段结构的非空数据，11 个成功但数据为空，19 个业务错误，3 个未确认。结构匹配不等于所有功能语义已验收。
- 带旧版签名的遗留读取：63 个返回非空 JSON 数据，25 个成功但数据为空，30 个业务错误，5 个非 JSON。这里只确认状态和载荷存在，尚未为所有结果建立完整响应模型。

签名从 APK 的 `NetWork.addSign()`、`xa.c()`、`xa.d()` 恢复：按发送参数对的顺序拼接 `name=value`，追加固定串并进行 UTF-8 MD5。辅助函数将排序后的参数按同一顺序签名并发送；这不代表 App 在所有场景都按字母排序。可选 `sig` 分支仍未恢复。未签名对照与带签名复测分别保留，避免把签名缺失误报成接口失效。

## 查询每项状态

- [完整 CSV](api-coverage.csv)：每条候选的路径、命令变体、类别、状态、协议关联和对应报告。
- [覆盖 JSON](../evidence/api-coverage.json)：额外保留 DEX 来源位置、推断边界及各次尝试。
- [协议读取结果](../evidence/broad-read-validation.json)、[遗留签名结果](../evidence/legacy-signed-validation.json)、[补充读取结果](../evidence/legacy-additional-validation.json)、[未签名对照](../evidence/legacy-unsigned-validation.json)。
- [请求类索引](../evidence/request-command-index.json)、[协议契约](../evidence/protocol-contracts.json)、[签名来源](../evidence/legacy-signature-chain.json)。

分类和按名称关联模型属于研究线索。例如不同路径末尾都叫 search，不代表使用相同协议；已明确取消表情搜索与吧务搜索的同名自动关联。业务错误可能来自参数、权限、场景或接口变化，不能统一归为不可用。空结果也不能升格为功能通过。

## 登录与未完成范围

用户已通过独立官方 Chrome 窗口扫码，网页登录标志确认成功。所需 Cookie 仅保存在本机 `.local/account.json`，原始用户资料和响应仅保存在忽略目录，未提交。

扩展请求中的 `credentials_supplied` 只表示请求携带了本地登录态，不证明每个 App 接口接受该身份。部分账号读取仍失败，尚未完成 App 身份编号与网页身份的交叉匹配；不能把扫码完成等同于所有客户端登录条件已满足。

写入、支付、账号安全操作没有在真实账号上试执行。具体候选和依赖见 [状态操作测试计划](stateful-test-plan.md)。其余未执行项包括 151 条 web 路由、部分遥测与媒体地址，以及尚未完成请求构造或行为分析的路径。它们均保留明确的未验证状态。

后续执行依赖专用测试吧、本人测试帖子、受控收件账号、可回收资源，以及支付或销号等操作的沙箱环境；部分读取还需要有效的房间、活动、主题、订单或会员场景样本。当前缺少这些资源，因此没有将全量任务标成完成。

## 重建与复测

Node.js 24+。提取和索引还需要原 APK、完整 JDK 及已校验的 JADX JAR。以下路径为示例，在仓库根目录运行：

```powershell
node scripts/discover-endpoints.mjs 'D:/targets/example.apk' .local/dex evidence/endpoint-candidates.json
node scripts/request-models.mjs .local/dex .local/all-protocol-models.json evidence/endpoint-candidates.json --all-models
java -Xmx3g -cp .local/jadx-complete.jar scripts/IndexRequestCommands.java 'D:/targets/example.apk' .local/request-commands.json
```

请求类索引仅覆盖直接继承 NetMessage 的类，且不跨控制流分支传播寄存器值。全量模式检查了 121 个类，118 个产生模型或命令线索，116 个命名空间形成契约。JADX 直接索引不是 REA Evidence；独立反编译的三个命令锚点已用于交叉核对。

线上读取会向真实服务发请求，按需选择，避免无变化时重复全量运行：

```powershell
node scripts/verify-reviewed-reads.mjs --live --account .local/account.json
node scripts/verify-legacy-reads.mjs --live --account .local/account.json --signed
node scripts/verify-legacy-reads.mjs --live --account .local/account.json --signed --additional
node --test tests/*.test.mjs
```

扩展验证依赖首批脚本留在 `.local/` 的公开帖子样本，以及全量协议模型。请求单并发，间隔至少 250 ms，默认总超时 12 秒、响应上限 1 MiB。原始响应不进入 Git；提交的报告只含字段名、状态、计数和摘要。更新证据后可运行 `node scripts/build-api-coverage.mjs` 重建覆盖 JSON，CSV 作为本次快照保留。本次未修改正式版本、创建标签或发布软件。

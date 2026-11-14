# Tieba APIs

基于百度贴吧 Android 22.13.1.1 APK 的接口研究与验证仓库，提供静态证据、协议字段、验证脚本和脱敏实测报告。适合继续研究请求构造与接口客户端；目前尚未提供完整 SDK，也没有完成所有候选的功能验收。

## 当前结果与证据范围

下表的全量计数来自保存的 **2026-11-13 线上观测**；2026-11-14 的指定帖子读取和写入补测独立记录，不混入历史计数。

| 范围         | 已保存结果                                                          | 如何理解                                           |
| ------------ | ------------------------------------------------------------------- | -------------------------------------------------- |
| 静态路径提取 | 603 条候选、568 个不同路径                                          | 包含 API、H5、媒体和遥测；存在字符串不代表接口可用 |
| 线上请求覆盖 | 195 个不同路径                                                      | 包含成功、空结果、业务错误和未确认响应             |
| 非空业务数据 | 105 个路径至少一次返回数据                                          | 包含结构或载荷检查，不能全部等同于功能验收通过     |
| 首批功能验证 | 5 类匿名读取能力                                                    | 已核对业务码及吧名、页码、帖子或用户编号的一致性   |
| 协议元数据   | 首批 11 个请求类、345 个 Wire 注解字段；扩展形成 116 个命名空间契约 | 字段和命令线索与实际请求结果分开记录               |

首批五类能力为帖子列表与分页、帖子详情、楼中楼、公开用户资料、发帖选吧搜索。后者是选择发帖目标吧的搜索，不是全站帖子搜索。

已完成官方网页扫码登录，并核对本轮 App 当前用户编号。指定帖已实测创建回复、创建楼中楼及删除本次内容，回查两条内容均已消失、原帖仍可读取；详见定向验证文档。双账号关注与取消关注也已实测并恢复原关系，各自隐私读取已核对身份；私信收发仍在协议恢复阶段。其他写入、支付和账号安全操作仍未执行。

## 文档导航

- [当前未完成项与限制原因](docs/remaining-validation.md) · [逐项 CSV](docs/current-api-coverage.csv)：合并全部补测，区分实测拒绝、空样本与尚待分析。
- [全量覆盖、状态解释与扩展验证](docs/full-coverage.md)：查看总体结果、登录边界和复现条件。
- [逐项覆盖 CSV](docs/api-coverage.csv) · [覆盖 JSON](evidence/api-coverage.json)：按路径、命令变体和状态查找证据。
- [指定帖子接口验证](docs/thread-validation.md)：帖子 [redacted-thread-id] 的读取、回复、楼中楼及清理实测，以及其他测试对象要求。
- [双账号接口验证](docs/two-account-validation.md)：关注、取消关注、隐私设置读取及私信协议的已验证范围。
- [首批五类功能验证](docs/validation.md)：具体核对条件、命令号与匿名复现方法。
- [首批请求字段表](docs/request-fields.md) · [扩展协议契约](evidence/protocol-contracts.json)：分别查看静态字段和更大范围的协议线索。
- [分析进展与来源](docs/investigation.md) · [状态操作测试计划](docs/stateful-test-plan.md)。
- [CHANGELOG](CHANGELOG.md)：面向使用者的待发布变化。

## 快速开始

需要 Node.js 24+。以下命令在仓库根目录运行，无需安装项目依赖：

```powershell
node scripts/catalog.mjs pb/floor
node --test tests/*.test.mjs
```

`catalog.mjs` 查询的是静态候选，不会发送网络请求；可用性需要再查覆盖报告。

复测首批五类匿名读取：

```powershell
node scripts/verify-app-reads.mjs --live
```

该命令向真实服务发送 7 次读取或负对照请求，默认每次总超时 12 秒、响应上限 1 MiB。业务码和返回对象检查均通过才判为成功；结果写入 `.local/verified-reads.json`，原始响应也留在忽略目录。它同时产生扩展脚本依赖的公开帖子样本。

扩展协议与遗留 JSON 读取另需准备协议模型、公开样本，使用本机登录态时还需本地配置，见 [扩展复测步骤](docs/full-coverage.md#重建与复测)。不要把登录态、Cookie 或账号数据写进命令行、文档或 Git。

## 分析对象与重新提取

- 文件：`baidutieba_AndroidPhone_1015363f.apk`，87,847,605 字节，13 个 DEX。
- 包名：`com.baidu.tieba`，版本：`22.13.1.1`。
- SHA-256：`06aa06e4579758e7fd33afe7d1a31a257c8ae6251965f3d8235b68cd965f2be3`。

从同一份 APK 重建首批证据：

```powershell
.\scripts\discover.ps1 -Apk 'D:\targets\example.apk'
node scripts/request-models.mjs .local/dex evidence/request-models.json evidence/endpoint-candidates.json
node scripts/document-models.mjs
```

APK 路径为示例。提取器只读取原 APK，DEX 临时文件保存在 `.local/dex`。不同 APK 应使用独立的 DEX 目录与证据，不要混用历史模型、命令索引或线上报告。PowerShell 如限制脚本执行，应先检查 `scripts/discover.ps1`，再在允许脚本的终端运行；不需要修改全局执行策略。

完整 APK、DEX、引擎、反编译全文和用户原始响应均不进入提交。协议元数据、摘要和来源位置见 [路径证据](evidence/endpoint-candidates.json)、[首批模型](evidence/request-models.json) 与 [APK 检查摘要](evidence/apk-summary.json)。

## REA 分析入口

本次使用 REA 6.4.0、JADX 0.7.1 和完整 JDK 25.0.1。命令入口仅向子进程传入引擎路径，不修改全局 Agent 配置：

```powershell
node scripts/rea.mjs inspect-android-package 'D:/targets/example.apk' --format json
```

新环境需安装固定运行包，并按 [REA Android 指南](https://github.com/Billy775326/rea/blob/main/docs/android-analysis.md) 准备同一 JAR，保存为 `.local/jadx-complete.jar`：

```powershell
npm.cmd install --prefix .local/rea-runtime --omit=optional --ignore-scripts rea-agents@6.4.0
```

入口会检查 JAR SHA-256，不接受不完整或不匹配的下载。上述安装不是登录态配置，也不意味着 REA 已注册到当前 Agent。

## 参考

参考 [cv-cat/DouYin_Spider](https://github.com/cv-cat/DouYin_Spider) 的接口、认证、参数构造和示例组织方式；贴吧协议结论来自本仓库记录的 APK 和实际响应，不从其他平台类推。静态分析使用 [REA](https://github.com/Billy775326/rea) 和直接 JADX 索引，两类证据的范围见对应报告。

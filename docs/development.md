# 开发与验证指南

当前主线代码使用 Node.js 24+ 与原生 ESM，无第三方运行依赖。普通客户端、离线测试不需要 JDK、APK 或浏览器；只有静态 APK 分析需要额外工具。

## 代码入口与检查

在仓库根目录执行：

```powershell
npm test
node main.mjs --help
node main.mjs status
node scripts/catalog.mjs pb/floor
```

测试包括请求和响应解析、业务码分级、64 位编号、认证投影、CLI 覆盖保护，以及基于本地临时 HTTP 服务的超时、大小上限和取消行为。测试不访问真实贴吧。当前没有额外配置的 linter、打包构建或自动发布流水线。

新功能在独立任务分支实现，保持旧脚本兼容。提交前核对差异、敏感信息与相关测试，英文提交采用 `type(scope): description`。普通推送不提升版本、不创建标签；正式发版另行确认，详见根目录 [AGENTS.md](../AGENTS.md)。

## 实现新的读取方法

1. 从 APK 或已有契约确认地址、命令、字段类型与认证条件。
2. 在 `src/api/read-contracts.mjs` 增加明确的请求常量与选定响应字段；编号使用字符串返回。
3. 在 `TiebaApi` 添加输入校验和对象核对，复用 HTTP 与公共字段构造。
4. 添加能够检验外部行为的成功、失败或边界测试，更新 [API](api.md)。
5. 必要的实测另行明确执行，将原始输出保留在 `.local/`，公开结果先脱敏。

`TiebaApi` 的 `transport` 构造参数可注入本地测试传输。它采用 `post(url, options)` 契约，通过 `onBody(Buffer)` 提供收到的响应体，并返回 HTTP 状态、分类、长度及摘要。生产实现只通过固定的贴吧主机调用。

读写判断必须来自具体请求语义。写入方法另需有受控对象、原始状态和清理回查，不能机械复制读取方法。对于业务错误、空结果和缺少协议的路径，保持对应状态，不能把它们批量标为不可用。

## 明确执行真实读取

```powershell
node main.mjs thread $env:TIEBA_TEST_THREAD --live --rn 2
node scripts/verify-app-reads.mjs --live
node scripts/verify-thread.mjs --live --thread $env:TIEBA_TEST_THREAD
```

这些命令会请求真实服务。CLI 输出在本地指定目录，验证工具则按原有约定保存响应和报告。账号与内容不要写进提交、测试夹具或报错文本。新的客户端冒烟结果见 [client-validation.json](../evidence/client-validation.json)，不改变历史阶段的请求总数。

## 离线重建覆盖报告

```powershell
node scripts/build-current-coverage.mjs
```

此命令仅依赖提交的脱敏证据，生成 `evidence/current-api-coverage.json`、`docs/current-api-coverage.csv` 及 `docs/remaining-validation.md`，不读取账号也不联网。

`build-im-validation.mjs` 与 `build-supplemental-validation.mjs` 使用本机冻结的原始文件；新克隆只有公开摘要，不能重造私人历史响应。更新时先审查新的观察，再显式纳入汇总。原始报告、后续观察和当前最强证据应保留区分。

## 全 APK 清单与 IM 身份读取

完整网络面扫描、请求继承与全部消息字段的复现步骤见 [APK 接口清单](network-inventory.md)。新增扫描工具需要 Python 3.11+（仅标准库）；默认 npm test 仍只需要 Node.js，Python 的 ZIP/CRC 测试通过 `python -m unittest discover -s tests -p test_apk_strings.py` 单独运行。归档原始字符串与完整方法字符串索引只写入 `.local/`。

`getImUserIdentities` 复用有界 HTTP 传输，但明确指定 `pim-identity-cookie` 策略；只有已标记 authenticated、无查询/片段/URL 凭据的固定 `https://pim.baidu.com/rest/3.0/im/get_user_info` 才允许 Cookie，其他地址和默认策略继续拒绝认证头。重定向不跟随，取消、大小和超时规则与现有 HTTP 一致。

## APK 静态分析环境

本项目的基线 APK 为 `com.baidu.tieba` 22.13.1.1，SHA-256：

```text
06aa06e4579758e7fd33afe7d1a31a257c8ae6251965f3d8235b68cd965f2be3
```

原分析使用 REA 6.4.0、JADX 0.7.1 和 JDK 25.0.1。仅需常规客户端时无需安装它们。分析时从同一 APK 重新提取：

```powershell
.\scripts\discover.ps1 -Apk 'D:\targets\example.apk'
node scripts/request-models.mjs .local/dex evidence/request-models.json evidence/endpoint-candidates.json
node scripts/document-models.mjs
```

APK 路径为示例。输出是静态证据，不等于请求已构造或线上功能通过。查看所有 `tbclient` 模型字段时使用单独的本机输出：

```powershell
node scripts/request-models.mjs .local/dex .local/all-protocol-models.json evidence/endpoint-candidates.json --all-models
```

上述 `--all-models` 保留原有 `tbclient` 范围。扫描整份 APK 的 Wire 类型并重建审核后的命令契约：

```powershell
node scripts/request-models.mjs .local/dex .local/all-apk-wire-models.json evidence/endpoint-candidates.json --all-wire-models
node scripts/build-wire-inventory.mjs .local/all-apk-wire-models.json evidence/endpoint-candidates.json evidence/wire-messages.json evidence/wire-request-inventory.json
node scripts/build-app-socket-contracts.mjs
node scripts/catalog.mjs --socket 104102
```

新克隆可以直接执行最后两条命令，不需要 APK、账号或联网。新的完整模式只保留 ProtoField 字段及其类型签名，不导出静态默认值；缺少任一基线 DEX 时拒绝完整扫描。

不要混用不同 APK 的 DEX、字段、命令索引或实测报告。完整 APK、引擎、反编译全文和原始用户响应留在忽略目录。

REA 入口需要固定运行包和完整引擎 JAR：

```powershell
npm.cmd install --prefix .local/rea-runtime --omit=optional --ignore-scripts rea-agents@6.4.0
node scripts/rea.mjs inspect-android-package 'D:/targets/example.apk' --format json
```

按 [REA Android 指南](https://github.com/Billy775326/rea/blob/main/docs/android-analysis.md) 准备 `.local/jadx-complete.jar`。入口校验 SHA-256，不改全局 Agent 配置；实际工具安装或服务注册与本项目运行配置是不同事项。

## 产物与资源管理

| 位置 | 内容与处理 |
| --- | --- |
| `src/`, `examples/`, `tests/` | 代码、可导入示例和脱敏测试数据 |
| `evidence/` | 可提交的结构化来源和脱敏观察 |
| `docs/` | 用户文档、开发文档和生成的状态说明 |
| `.local/` | 账号、原始响应、输出、APK、DEX、分析引擎和临时结果；不进入提交 |

HTTP 每次有总超时、响应上限，完成后移除取消监听；没有隐式重试、分页循环或持久后台任务。IM 长连接在使用结束时调用 `close()`，取消和错误不能只改界面状态。新测试临时目录应独立创建，并在确认路径归属后清理。

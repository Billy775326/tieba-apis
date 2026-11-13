# Tieba APIs

基于指定百度贴吧 Android APK 的接口研究仓库，目标是实现有证据支持、可验证的接口客户端。

当前已完成静态路径和请求模型提取，并通过 REA/JADX 检查 APK 和定位请求构造类，尚未实现可线上使用的接口 SDK。接口签名、HTTP 请求构造、登录状态、响应结构和分页行为仍需继续验证。

## 当前结果

- APK：`baidutieba_AndroidPhone_1015363f.apk`，87,847,605 字节，13 个 DEX。
- SHA-256：`06aa06e4579758e7fd33afe7d1a31a257c8ae6251965f3d8235b68cd965f2be3`。
- 423 条静态路径候选，包含客户端路径和 H5 页面；路径存在不代表当前可调用。
- 11 个请求类、345 个带 Wire 注解的字段，保留字段编号、类型及位置。

[路径证据](evidence/endpoint-candidates.json) · [模型证据](evidence/request-models.json) · [请求字段表](docs/request-fields.md) · [分析进展](docs/investigation.md)

## 本地使用

需要 Node.js 24 或更新版本。以下命令在仓库根目录运行，无需安装项目依赖。

```powershell
node scripts/catalog.mjs pb/floor
node --test tests/*.test.mjs
```

从自己的同一份 APK 重建证据：

```powershell
.\scripts\discover.ps1 -Apk 'D:\targets\example.apk'
node scripts/request-models.mjs .local/dex evidence/request-models.json evidence/endpoint-candidates.json
node scripts/document-models.mjs
```

APK 路径为示例。PowerShell 若禁止执行脚本，可检查 `scripts/discover.ps1` 后在允许脚本的终端执行；不需要修改全局执行策略。

提取过程只读取原 APK；DEX 临时文件保存在忽略目录 `.local/dex`。不要将 APK、反编译全文、登录 Cookie、Token、账号数据提交到仓库。不同 APK 的提取应使用新的 `.local/dex` 目录，避免混入上一版本的 DEX。

## REA 分析入口

本机已准备 REA 6.4.0 和通过固定 SHA-256 校验的 JADX 0.7.1。入口仅向子进程传入引擎路径，不修改全局 Agent 配置：

```powershell
node scripts/rea.mjs inspect-android-package 'D:/targets/example.apk' --format json
```

在其他机器使用前，安装固定运行包并按 [REA 官方指南](https://github.com/Billy775326/rea/blob/main/docs/android-analysis.md) 准备同一 JAR，保存为 `.local/jadx-complete.jar`：

```powershell
npm.cmd install --prefix .local/rea-runtime --omit=optional --ignore-scripts rea-agents@6.4.0
```

APK 路径为示例；启动入口会核对 JAR 哈希，不接受不完整或不匹配的下载。

## 参考

参考 [cv-cat/DouYin_Spider](https://github.com/cv-cat/DouYin_Spider) 的接口、认证、参数构造和使用示例分层方式；贴吧协议结论来自本仓库记录的 APK，不从其他平台接口类推。

分析工具使用 [REA](https://github.com/Billy775326/rea)。路径和字段证据由本仓库脚本提取；REA/JADX 的实际检查摘要见 [APK 摘要](evidence/apk-summary.json)。这些结果不代表已完成线上验证。

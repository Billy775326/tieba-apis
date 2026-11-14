# Tieba APIs

百度贴吧 Android 22.13.1.1 的接口客户端与逆向验证项目，使用 Node.js 24+。提供 10 个读取与 2 个受控写入方法、命令行入口、IM 协议模块，以及按 APK 和真实响应整理的字段、实测结果与未完成清单。

## 功能与当前状态

| 能力 | 使用入口 | 当前范围 |
| --- | --- | --- |
| 贴吧帖子列表、分页 | `TiebaApi.getForumThreads()` | 已封装并实测 |
| 帖子详情、回复列表 | `TiebaApi.getThread()` | 支持帖子编号及官方帖子 URL |
| 楼中楼 | `TiebaApi.getPostReplies()` | 支持空首页返回分页 0/0 |
| 用户资料 | `TiebaApi.getUserProfile()` | 返回选定资料字段，支持复用本地账号 |
| 发帖选吧搜索 | `TiebaApi.searchForums()` | 搜索目标吧，不是全站帖子搜索 |
| 地点建议、小尾巴、本人隐私、获赞通知、首页轮询 | [客户端 API](docs/api.md) | 新增 5 个读取方法；空样本和结构核对范围单独记录 |
| 帖子点赞/取消、移除单个粉丝 | `TiebaApi.setThreadLike()` / `removeFollower()` | 两账号或指定帖验证状态变化并恢复；方法返回服务端确认 |
| IM 用户编号转换 | `getImUserIdentities()` | 新增 bd_uid → IM UK 查询，两个受控账号已核对 |
| 私信与 SDK 普通群聊 | [IM 实测与协议](docs/im-validation.md) | 双账号核心收发、回读、撤回和清理已测；统一客户端暂未封装这些业务操作 |
| 发帖、回复、设置等写入 | [状态操作报告](docs/stateful-test-plan.md) | 部分流程有受控实测，使用各自专题说明 |
| 原生 App Socket | [协议与实测](docs/app-socket-validation.md) | 10 个命令已请求；新增黑名单和私信提醒状态恢复验证，提供帧编解码模块 |
| 全 APK 网络面与消息声明 | [接口清单](docs/network-inventory.md) | 3690 个字符串形态候选、145 个请求封装与 1974 个 Wire 消息类型，静态扫描不等于业务通过 |
| 全部静态候选 | [逐项覆盖表](docs/current-api-coverage.csv) | 603 条候选含 H5、媒体、遥测和命令变体；尚未完成全部业务验收 |

当前覆盖清单有 45 条候选（41 个不同路径）完成对象或状态核对，176 条仅有匿名诊断。本轮新增 7 个 SDK 方法并记录 38 次请求，详见 [新增接口实测](docs/expanded-api-validation.md)。未排除的 549 条生产候选均有请求记录；这些数字不等于可用 SDK 方法数。继续验证另记录 63 次业务/媒体请求及 8 次握手探测，见 [Socket 与继续验证](docs/app-socket-validation.md)。完整边界见 [当前验证范围](docs/remaining-validation.md)。

## 快速开始

在当前分支的仓库根目录执行，需要 Node.js 24+，无需安装第三方运行依赖：

```powershell
node main.mjs --help
node main.mjs status
npm test
```

以上为离线操作。读取真实帖子：

```powershell
node main.mjs thread $env:TIEBA_TEST_THREAD --live --rn 2
```

命令将结果保存到 `.local/output/` 的独立 JSON 文件，终端只打印业务码、响应摘要和文件路径。已有文件不会被覆盖。更多命令、配置及认证见 [使用指南](docs/getting-started.md)。

作为模块调用：

```javascript
import { TiebaApi } from './src/index.mjs';

const api = new TiebaApi();
const result = await api.getThread(process.env.TIEBA_TEST_THREAD, { pn: 1, rn: 2 });
console.log(result.thread.title);
```

库方法被显式调用时才发送请求；导入模块和构造客户端不会联网。编号以十进制字符串返回，避免 64 位整数精度丢失。参数、输出字段与错误处理见 [客户端 API](docs/api.md)。

## 配置与账号

首次配置可将 [config.example.json](config.example.json) 另存为 `.local/config.json`；已有配置直接编辑。默认匿名读取，不需要账号文件。

```json
{
  "timeoutMs": 12000,
  "maxResponseBytes": 1048576,
  "accountPath": null,
  "outputDir": "output"
}
```

`accountPath` 和 `outputDir` 相对于配置文件目录解析。复用已确认的登录态时，将 `accountPath` 改为本地账号 JSON 的路径，例如同目录的 `account.json`：

```powershell
node main.mjs thread $env:TIEBA_TEST_THREAD --live --config .local/config.json
```

账号格式见 [空白样例](examples/account.example.json)，真实文件留在 `.local/`。当前入口读取已有 `BDUSS`、`tbs` 与可选 `uid`，不会代替浏览器完成扫码登录。IM 登录仍使用 [专用入口](docs/im-validation.md#复现本人-im-登录)。

## 项目结构

```text
main.mjs                  命令行入口
config.example.json       运行配置样例
src/
  index.mjs               可导入的客户端入口
  cli.mjs                 命令分发与结果落盘
  api/                    业务接口、请求构造与响应字段投影
  auth.mjs                本地认证对象
  config.mjs              协议常量、配置与运行上限
  http/                   有界 HTTP 传输与取消
  im-*.mjs                IM 帧、签名与 TLS 连接
  app-socket-protocol.mjs  旧 App WebSocket 内层帧、派生密钥和有界解码
  *.mjs                   Protobuf、签名、媒体和验证基础模块
examples/                 可导入的调用示例
scripts/                  兼容保留的提取、验证与证据构建工具
tests/                    离线测试
docs/                     使用、开发、协议与实测说明
evidence/                 脱敏字段及观测证据
.local/                   忽略的登录态、原始响应和运行输出
```

分层职责、参考项目与兼容性说明见 [项目架构](docs/architecture.md)。

## 文档导航

| 目标 | 文档 |
| --- | --- |
| 配置、CLI、模块调用 | [使用指南](docs/getting-started.md) · [API 文档](docs/api.md) |
| 扩展代码、检查与 APK 提取 | [开发指南](docs/development.md) · [项目架构](docs/architecture.md) |
| 查找特定接口是否已测 | [当前覆盖](docs/remaining-validation.md) · [CSV](docs/current-api-coverage.csv) · [JSON](evidence/current-api-coverage.json) |
| 查看本客户端实测 | [首批客户端摘要](evidence/client-validation.json) · [新增接口实测](docs/expanded-api-validation.md) |
| 阅读私信与群聊细节 | [IM 实测](docs/im-validation.md) · [双账号报告](docs/two-account-validation.md) |
| 阅读帖子及设置操作 | [指定帖报告](docs/thread-validation.md) · [状态操作](docs/stateful-test-plan.md) |
| 区分匿名诊断与业务验证 | [后续逐项验证](docs/supplemental-validation.md) · [历史扩展验证](docs/full-coverage.md) |
| 查完整网络面、Socket 命令与 Wire 类型 | [APK 接口清单](docs/network-inventory.md) |
| 查原生 Socket 命令、字段及状态恢复 | [Socket 实测](docs/app-socket-validation.md) · [契约](evidence/app-socket-contracts.json) |
| 查字段与来源 | [请求字段](docs/request-fields.md) · [协议契约](evidence/protocol-contracts.json) · [分析记录](docs/investigation.md) |
| 验收结果与后续资源 | [验收记录](docs/acceptance.md) |
| 查看本次变化 | [CHANGELOG](CHANGELOG.md) |

## 分析对象与参考

对象为 `com.baidu.tieba` 22.13.1.1，APK 共 13 个 DEX、87,847,605 字节，SHA-256 为 `06aa06e4579758e7fd33afe7d1a31a257c8ae6251965f3d8235b68cd965f2be3`。静态提取、请求构造和真实响应分别记录，不从路径名称推断可用性。

项目分层与文档组织参考 [cv-cat/DouYin_Spider](https://github.com/cv-cat/DouYin_Spider/tree/d151f9c2980abc304c1ae4918c2272675cd9e4c2)，具体采用方式见 [架构说明](docs/architecture.md#参考来源)。贴吧参数和能力结论来自本项目记录的 APK 与实测。仓库当前未设置 `LICENSE` 文件。

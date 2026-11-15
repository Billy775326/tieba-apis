# Tieba APIs

百度贴吧 **PC 网页接口**的提取、查询与验收项目，使用 Node.js 24+。当前按官方 PC 前端脚本和真实网页会话核对接口，不需要安卓手机；网页登录态由浏览器管理，不导出 Cookie。

早期 Android APK、App Socket 和 IM SDK 研究保留为历史材料，不计入 PC 网页接口的可用数量。

## 当前 PC 范围

| 项目 | 当前记录 |
| --- | --- |
| 前端源码 | 当前页面加载的 4 个官方脚本，记录 URL、大小、SHA-256 和引用位置 |
| 静态请求候选 | 84 个路径、86 个路径/方法组合；不是全部已可用接口 |
| 本轮实测 | 70 条业务调用记录；公开验收入口另有 2 次身份读取，页面资源与后台令牌请求不计入 |
| 已请求候选 | 26 个路径/方法组合，其中 7 个完成对象或状态核对 |
| 其他结果 | 13 个仅结构核对、2 个空结果、4 个业务错误；60 个尚未验证，包含 6 个按原要求排除的吧务候选 |
| 可复跑入口 | 连接已登录的本机 Chrome，只验证网页读取接口 |

帖子详情 `page_pc` 使用 `kz`，已核对指定帖子；论坛页、本人隐私、用户卡片和吧卡片完成对象核对。PC `follow_pc / unfollow_pc` 已完成关注、回查、取消关注与恢复原关系。通知与本人列表等读取仍按实际样本区分结构核对和完整业务验收。

逐项结果见 [PC 接口覆盖 CSV](docs/pc-web-api-coverage.csv)、[验收说明](docs/pc-web-validation.md) 和 [脱敏证据](evidence/pc-web-validation.json)。

## 离线查询

在仓库根目录执行，无需第三方 npm 依赖、浏览器或账号：

```powershell
node scripts/catalog.mjs --pc-web
node scripts/catalog.mjs --pc-web page_pc
node scripts/catalog.mjs --pc-status follow_pc
npm.cmd test
```

也可使用 `npm.cmd run catalog:pc`、`npm.cmd run status:pc` 和 `npm.cmd run verify:pc -- --help`。

`--pc-web` 查看源码声明，`--pc-status` 查看已保存验收结果；不带关键词时只显示摘要，不联网。

## 复跑网页读取验收

使用已扫码登录的专用 Chrome 调试会话，并保留官方 PC 首页或论坛页。已有本项目扫码窗口时：

```powershell
$pcBrowserPort = Get-Content .local/login-browser/DevToolsActivePort -First 1
node scripts/verify-pc-web.mjs --live --port $pcBrowserPort --thread "$env:TIEBA_TEST_THREAD" --forum "$env:TIEBA_TEST_FORUM"
```

没有现成会话时，按 [网页验收指南](docs/pc-web-validation.md#准备浏览器会话) 启动专用 Chrome 并扫码。脚本默认只显示帮助，必须显式提供 `--live` 与本机调试端口才请求服务；只读白名单包含帖子/吧详情、本人列表、通知和配置，不发帖、不关注、不删除。

结果默认写入 `.local/` 的唯一新文件，已有文件不会被覆盖。输出仅含状态、字段名、列表长度、摘要和断言，Cookie、TBS、防护令牌及用户响应正文不离开浏览器。

## 文档与代码

| 入口 | 用途 |
| --- | --- |
| [PC 验收指南](docs/pc-web-validation.md) | 参数、当前结果、失败原因、样本和浏览器准备 |
| [PC 覆盖 CSV](docs/pc-web-api-coverage.csv) | 86 个候选逐项状态 |
| [PC 源码清单](evidence/pc-web-api-catalog.json) | 当前官方脚本、请求方法和源码位置 |
| [PC 脱敏记录](evidence/pc-web-validation.json) | 70 条调用、受控关注恢复和最初验证器问题 |
| [资源说明](docs/acceptance.md) | 当前需要哪些资源及历史基础验收 |
| [开发指南](docs/development.md) | 环境、检查与历史提取流程 |
| [CHANGELOG](CHANGELOG.md) | 待发布变化 |

PC 工具位于 `scripts/build-pc-web-catalog.mjs`、`scripts/catalog.mjs`、`scripts/verify-pc-web.mjs`，共用本机 CDP 连接和结果分级模块位于 `src/pc-web-*.mjs`。

## 历史 App 研究

仓库仍保留 12 个 App `TiebaApi` 方法及独立 IM 查询，接口约定见 [历史客户端 API](docs/api.md)，示例与架构见 [原使用指南](docs/getting-started.md) 和 [架构说明](docs/architecture.md)。这些接口不属于当前 PC 交付入口，不将 APK 模型、Socket 命令或 App 私信成功算作网页通过。

固定 APK 为 Android 22.13.1.1，SHA-256 `06aa06e4579758e7fd33afe7d1a31a257c8ae6251965f3d8235b68cd965f2be3`；原网络面和边界见 [APK 清单](docs/network-inventory.md)。项目早期分层参考 [cv-cat/DouYin_Spider](https://github.com/cv-cat/DouYin_Spider/tree/d151f9c2980abc304c1ae4918c2272675cd9e4c2)。当前未设置 LICENSE 文件。

# PC 网页接口调用示例

按操作场景给出可在当前仓库执行的命令、输出读法和业务契约入口。需要 Node.js 24+；所有命令在仓库根目录运行。例子分别标明离线查询、只读联网和定向写入文档，完整环境及配置见 [使用指南](getting-started.md)。

## 查询接口和当前状态

先定位方法，再查询验收结果：

```powershell
node scripts/catalog.mjs --pc-web sign_pc
node scripts/catalog.mjs --pc-status sign_pc
```

两条命令都不联网。第一个输出静态路径、方法和 sites；第二个输出 summary 与 results 中的已保存状态。当前提交中，签到结果项的节选如下；它来自公开报告，不是新发起的签到响应：

```json
{
  "path": "/c/c/forum/sign_pc",
  "method": "POST",
  "best_status": "verified-state-change",
  "latest_error_code": "0",
  "observations": 3
}
```

省略关键词时 results 为空数组，仅输出总体摘要。observations 是该路径/方法的记录数，不是执行这条查询命令时发起的请求数。

## 读取帖子和吧

先按 [浏览器准备步骤](pc-web-validation.md#准备浏览器会话) 启动专用 Chrome 并扫码，保持官方首页或论坛页打开。以下端口与准备示例一致：

```powershell
node scripts/verify-pc-web.mjs --live --port 9222 --thread https://tieba.baidu.com/p/11185790604 --forum 雷神加速
```

该命令执行固定白名单，包括目标帖子和独立指定的吧，同时读取本人信息、通知与配置。它不是仅发送一次 page_pc 请求的通用业务 SDK。终端最后的 output 指向新的本地报告；字段和退出码见 [运行结果](getting-started.md#查看运行结果)。

## 按功能查找调用契约

下表命令均为离线查询，查询本身不会执行对应操作。

| 场景 | 命令 | 输入、返回与验收说明 |
| --- | --- | --- |
| 点赞与取消 | `node scripts/catalog.mjs --pc-status opAgree_pc` | [obj_type、op_type 与状态恢复](pc-web-basic-functions.md#点赞和取消点赞) |
| 普通回复和楼中楼 | `node scripts/catalog.mjs --pc-status post/add_pc` | [父子编号、本人作者与正文](pc-web-basic-functions.md#普通回复与楼中楼) |
| 删除本人回复 | `node scripts/catalog.mjs --pc-status delpost_pc` | [只删除本轮验证过的本人内容](pc-web-basic-functions.md#删除本人测试回复) |
| 收藏和取消 | `node scripts/catalog.mjs --pc-status store_pc` | [未收藏基线及有效输入](pc-web-basic-functions.md#收藏和取消收藏) |
| 搜索建议、帖子、吧、用户及综合搜索 | `node scripts/catalog.mjs --pc-status search` | [查询词、吧内搜索参数与目标核对](pc-web-sign-search-publish.md#搜索) |
| 签到 | `node scripts/catalog.mjs --pc-status sign_pc` | [关注条件、新签到与重复签到](pc-web-sign-search-publish.md#签到与关注条件) |
| 发主帖和本人删除 | `node scripts/catalog.mjs --pc-status thread/add_pc`、`node scripts/catalog.mjs --pc-status delthread_pc` | [官方编辑器、first_floor 与删除后回查](pc-web-sign-search-publish.md#发主帖及本人删除) |

写入专题给出本轮有效组合和判据，目前没有可直接照搬的通用 PC 发帖、签到或互动 CLI。发主帖只通过官方编辑器完成过定向验收，完整线级表单未导出；不能把 App 的 TiebaApi 示例替换路径后当作 PC 客户端。

## 在 Node.js 中读取公开验收记录

以下代码可保存为忽略目录中的 `.local/read-sign-status.mjs`，在仓库根目录使用 `node .local/read-sign-status.mjs` 执行。它只读取提交的脱敏 JSON，不连接 Chrome、不访问贴吧：

```javascript
import fs from 'node:fs';

const report = JSON.parse(fs.readFileSync('evidence/pc-web-validation.json', 'utf8'));
const result = report.rows.find(row =>
  row.path === '/c/c/forum/sign_pc' && row.method === 'POST'
);
if (!result) throw new Error('PC sign contract not found');
console.log(result.best_status, result.latest_error_code);
```

当前记录预期打印 `verified-state-change 0`。同样可以按 path 和 method 联合查询其他接口，避免合并 POST 与 GET 变体。后续验收状态改变时，以当前提交的数据为准。

## 判断结果而不误报

- verified-read / verified-state-change 表示已有相应对象或状态核对，不等于所有参数和边界都通过。
- response-schema-validated 仅证明已检查结构；accepted-empty-response 保留空样本分支。
- best_status 是最强已保存证据，latest_error_code 是最近观察。比如删除测试帖后的已知读取入口返回 4，是预期的对象不可读回查；不得据此抹掉之前的读取证明。
- 未确认原因的业务错误和本机调试问题分别记录。逐项结果见 [PC 覆盖 CSV](pc-web-api-coverage.csv)，全部功能状态见 [README](../README.md#功能)。

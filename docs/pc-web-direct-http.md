# PC 直接 HTTP 验证与数据刷新

接口验收以独立构造的 HTTP 请求及其响应为准。浏览器承载既有登录态；PC 签名在本地实现，写入所需 jt/Acs 由官方安全 SDK 提供。业务测试不点击点赞、发布或其他按钮，不调用官方前端 HTTP 封装，也不以页面显示变化代替接口回读。

本轮新增 **40 条直接 HTTP 业务响应，覆盖 17 个路径/方法组合**，另有 6 次身份/会话准备请求。累计报告为 430 条。此前 390 条记录保持原样；其中两次编辑器驱动的主帖创建单独标识为历史 UI 驱动记录。62 个有对象或状态证据的候选，不代表 62 个都已用新直连实现复测。

详情见 [直连证据](../evidence/pc-web-direct-http-validation.json)、[累计报告](../evidence/pc-web-validation.json) 和 [覆盖 CSV](pc-web-api-coverage.csv)。新增 direct_http_observations 与 direct_http_best_status 逐项说明直连观测；总 best_status 仍保留各阶段最强证据。

## 复跑直连接口

在仓库根目录、现有专用 Chrome 已登录的情况下：

~~~powershell
node scripts/verify-pc-web.mjs --live --port 9222 --thread "$env:TIEBA_TEST_THREAD" --forum "$env:TIEBA_TEST_FORUM"
node scripts/verify-pc-web.mjs --live --port 9222 --thread "$env:TIEBA_TEST_THREAD" --forum "$env:TIEBA_TEST_FORUM" --refresh-session
~~~

当前公开入口仍为固定读取白名单，10 项业务请求，指定 forum 时为 11 项；每轮另向 json_userinfo 与 /dc/common/tbs 请求两次会话准备数据。端口应使用实际专用 Chrome 端口，准备方法见 [网页指南](pc-web-validation.md#准备浏览器会话)。

--refresh-session 对当前选中的专用官方首页/论坛页执行 ignoreCache 重载，并等待新的页面时间原点后重新初始化请求会话。它用于刷新会话和页面上下文，不用于证明任何写入成功；重载前应保存该测试页的未提交草稿。

## 如何避免读取旧状态

- 每次直接 fetch 使用 cache=no-store、独立防缓存参数及重新计算的 PC 签名。请求不经过前端预取结果、Vue 状态或列表组件。
- HTTP/业务码、对象断言和 SHA-256 都取自同一次 fetch 的响应字节。请求失败时立即清空上一份响应，防止把旧成功数据当作本次结果。
- 响应带 tieba-response-via=prefetch 或 Age 大于零时，标记 freshness-unconfirmed，读取验收失败，不能提升为当前状态已验证。
- 写入后重新发送读取接口；必要时有界等待后再次读取，或刷新专用上下文再读。页面刷新与业务接口读取分别记录。

no-store 和防缓存参数针对浏览器/前端缓存，不能保证服务端索引或业务状态立即更新。仍需区分业务失败、传播延迟、缓存未确认和本机传输异常。

## 独立写入结果

| 项目 | 直接 HTTP 判据 |
| --- | --- |
| 点赞与恢复 | 读取明确基线，独立 GET opAgree_pc，再以新 POST page_pc 回读变化；独立取消后回读原值恢复 |
| 发主帖 | 独立签名 multipart POST thread/add_pc；回读新编号、本人作者、目标吧、标题及唯一正文标记 |
| 删除主帖 | 独立 POST delthread_pc；详情及删除前已验证的首楼定位均返回 4 |
| 招募取消 | 刷新上下文后的直接 GET register 仍返回 990000；最新独立详情仍为已报名/已获资格，具体原因未确认 |

主帖本轮有效字段如下，不宣称每项都是服务端必填：

| 字段 | 本轮构造 |
| --- | --- |
| kw、fid | 已授权测试吧与读取到的吧编号 |
| title、content | 本次专用测试内容；实际编号和标记不公开 |
| is_hide、is_pictxt | 0、字符串 1 |
| ext | 包含 is_hide=0、needImage=1 的 JSON 字符串 |
| post_prefix | 空字符串 |
| jt、tbs | 由授权会话及官方 SDK 在浏览器内取得，不导出 |
| subapp_type、_client_type | pc、20 |
| _、sign | 本次新参数及 PC MD5 签名；Acs-Token 仅作为当前请求头使用 |

独立请求的签名排序与公共参数依据已固定的官方 pc-common/base 脚本 c:344，来源与 SHA-256 见本轮证据。内部模块位于 src/pc-web-direct.mjs；src/index.mjs 仍不导出 PC 通用写入 SDK，公开 CLI 不提供发帖或点赞命令。

## 验证范围

本次只创建并删除一条新的自有测试主帖，点赞恢复原值，没有新增预约或招募报名。原先两项预约仍保留；招募取消失败及资格状态也保留。历史结果与新的直连结果按执行方式分开，不把 UI 驱动或官方前端封装请求冒充本次独立请求。

新增回归检查覆盖 UTF-8/多数据块 MD5 与 Node 原生摘要的独立比对、真实本地 HTTP 收包、连续请求新数据、预取/年龄拒绝、超限响应和旧数据清理；本地测试不访问真实贴吧。

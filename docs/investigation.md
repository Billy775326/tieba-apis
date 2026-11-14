# 贴吧 APK 分析进展

## 已观察事实

分析对象及哈希见 [路径证据](../evidence/endpoint-candidates.json)。13 个 DEX 的初步提取覆盖 423 条字符串；补齐 c/c、c/e 等家族后，当前范围为 603 条候选、568 个不同路径，见 [全量覆盖报告](full-coverage.md)。它们包含读取、写入、遥测和 H5 页面，数量不等于可调用接口数量。

首批字段表选取了 `classes5.dex` 中的 11 个请求模型。345 个字段带 `com.squareup.wire.ProtoField` 注解。原始字段索引、类索引、tag、显式类型和 label 见 [模型证据](../evidence/request-models.json)。字段表是直接读取 DEX 元数据的结果；REA/JADX 已独立确认包信息和请求构造类，字段表整体尚未交叉验证。

## 首批调查目标

下表列出首批调查方向。FrsPage、楼中楼和选吧搜索已追踪请求构造或编码方法；下列 5 类能力还通过返回对象核对建立了线上读取证据，详情见 [验证报告](validation.md)。

| 功能方向       | APK 中存在的路径            | 请求模型                           | 已观察的部分字段 tag                 |
| -------------- | --------------------------- | ---------------------------------- | ------------------------------------ |
| 吧内帖子列表   | `c/f/frs/page`              | `tbclient.FrsPage.DataReq`         | kw=1, rn=2, pn=15, common=39         |
| 帖子详情及回复 | `c/f/pb/page`               | `tbclient.PbPage.DataReq`          | kz=4, pid=7, rn=13, pn=18, common=25 |
| 楼中楼         | `c/f/pb/floor`              | `tbclient.PbFloor.DataReq`         | kz=1, pid=2, pn=4, common=9          |
| 用户资料       | `c/u/user/profile`          | `tbclient.Profile.DataReq`         | uid=1, pn=6, rn=7, common=9          |
| 发帖选吧搜索   | `c/f/forum/searchPostForum` | `tbclient.SearchPostForum.DataReq` | common=1, word=2                     |

另观察到 `c/f/pb/page?cmd=302001&format=protobuf` 和 `c/f/frs/page?cmd=301001&format=protobuf` 字符串；不能据此断定所有请求都使用这些 cmd，也不能认为同一路径的不同 cmd 可互换。

`CommonReq.BDUSS` 的 tag 为 10。首批五类读取未携带账号登录态；后续扫码所得登录态仅保存在本机忽略目录，并用于扩展读取尝试，未提交。是否必需登录态及哪些公共字段必填，需按具体接口和场景判断，不能由字段存在推断。

## 已追踪的 FrsPage 编码链路

REA/JADX 对实际 APK 的构造函数和 `encode(boolean)` 反编译确认：构造函数引用命令号 301001；编码方法把 kw、pn、rn、sort_type 等实例参数填入 DataReq.Builder，调用公共参数绑定函数，再将 DataReq 放入 FrsPageReqIdl.data 并返回请求模型。参见 [请求链路摘要](../evidence/frs-request-summary.json) 中的父 Evidence ID 与源文本哈希。完整反编译输出保存在本机忽略目录。

这将 FrsPage 请求构造类与请求模型联系起来。已有 POST、Protobuf multipart 和真实响应证据，并恢复了部分遗留 JSON 签名逻辑，见 [请求链路](../evidence/http-request-chain.json) 与 [签名来源](../evidence/legacy-signature-chain.json)；App 发送器的部分实现和可选 sig 分支仍未完全恢复。静态代码包含 Titan 拦截分支，运行时可能替换这些逻辑。

## 工具与待完成工作

Windows 本机 Node.js 24.16.0、npm 11.13.0、完整 JDK 25.0.1 可用。REA 6.4.0 已安装在忽略目录 `.local/rea-runtime`，`--version` 和 Android 命令帮助已成功执行。REA 源码归档位于同级 `../rea`；Git 智能传输失败，因此该目录是源码快照，不包含克隆历史。

JADX 0.7.1 已完成下载并校验，SHA-256 为 `6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75`，完整文件为 `.local/jadx-complete.jar`。

本机已成功执行 APK 检查；复查入口（仓库根目录，替换示例路径）：

```powershell
$env:REA_JADX_MCP_JAR = (Resolve-Path '.local/jadx-complete.jar').Path
node .local/rea-runtime/node_modules/rea-agents/scripts/rea.mjs inspect-android-package 'D:/targets/example.apk' --format json
```

APK 路径为示例。现已通过实际请求确认本次最小匿名 Protobuf multipart 构造可用于 5 类读取能力，见 [验证报告](validation.md)。扩展请求已覆盖 195 个不同路径，其中 105 个返回过非空数据，见 [全量覆盖报告](full-coverage.md)。上述路径计数属于历史快照。后续指定帖及双账号补测、402 次请求和新的 APK 引用索引见 [当前验证范围](remaining-validation.md)；主帖首楼清理限制也在其中单独记录。完整 SDK 和发送链路仍未完成。

独立 JADX 方法引用索引可在同一环境重新生成；APK 路径为示例，输出先保存在忽略目录，字段线索不等于线上验证：

```powershell
java --class-path .local/jadx-complete.jar scripts/IndexEndpointReferences.java 'D:/targets/example.apk' evidence/endpoint-candidates.json .local/endpoint-references.json
node scripts/build-endpoint-reference-summary.mjs
node scripts/build-current-coverage.mjs
```

## 验证边界

已对真实 APK 完成路径和字段提取。提取器通过重复源位置、路径误匹配、截断 DEX 和未知 DEX 版本测试。

REA/JADX 已成功检查包名 `com.baidu.tieba`、版本 `22.13.1.1`、52,181 个类和 10,941 个资源，摘要及父 Evidence ID 见 [APK 摘要](../evidence/apk-summary.json)。已成功读取 `FrsPageRequestMessage` 的成员及构造函数；构造函数引用 cmd `301001`，包含 Titan 热修复拦截分支，不能将静态逻辑等同于当前运行路径。现已完成五类匿名读取的对象核对及扩展读取尝试，并确认官方网页登录成功；这不等于所有 App 接口接受该身份。尚未完成全量功能验收、App 传输逐字节对照、APK 签名验证或设备测试。没有运行目标 App。后续已按授权完成两条回复清理、关注关系和设置恢复；本人新主帖创建及详情删除已验证，但首楼按编号仍可读取，完整清理未通过。私信未发送；吧务按用户要求排除。

## 实际参考资料

- [cv-cat/DouYin_Spider README](https://github.com/cv-cat/DouYin_Spider/blob/master/README.md)：参考接口、登录和示例的组织方式。
- [cv-cat 的接口实现](https://github.com/cv-cat/DouYin_Spider/blob/master/dy_apis/douyin_api.py)：参考认证、参数构造、传输及响应解析分离；未复制其代码，也不以抖音协议推断贴吧协议。
- [REA Android 分析指南](https://github.com/Billy775326/rea/blob/main/docs/android-analysis.md)：工具前提、调用方式及证据边界。

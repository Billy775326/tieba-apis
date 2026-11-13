# 贴吧 APK 分析进展

## 已观察事实

分析对象及哈希见 [路径证据](../evidence/endpoint-candidates.json)。13 个 DEX 中找到 423 条匹配指定前缀的路径字符串。它们包含读取、写入、遥测和 H5 页面，数量不等于可调用接口数量。

`classes5.dex` 定义了本次提取的 11 个请求模型。345 个字段带 `com.squareup.wire.ProtoField` 注解。原始字段索引、类索引、tag、显式类型和 label 见 [模型证据](../evidence/request-models.json)。字段表是直接读取 DEX 元数据的结果；REA/JADX 已独立确认包信息和请求构造类，字段表整体尚未交叉验证。

## 首批调查目标

下表的功能和模型关联是根据命名提出的调查方向，尚未通过请求调用点或网络行为验证。

| 功能方向       | APK 中存在的路径            | 待追踪模型                         | 已观察的部分字段 tag                 |
| -------------- | --------------------------- | ---------------------------------- | ------------------------------------ |
| 吧内帖子列表   | `c/f/frs/page`              | `tbclient.FrsPage.DataReq`         | kw=1, rn=2, pn=15, common=39         |
| 帖子详情及回复 | `c/f/pb/page`               | `tbclient.PbPage.DataReq`          | kz=4, pid=7, rn=13, pn=18, common=25 |
| 楼中楼         | `c/f/pb/floor`              | `tbclient.PbFloor.DataReq`         | kz=1, pid=2, pn=4, common=9          |
| 用户资料       | `c/u/user/profile`          | `tbclient.Profile.DataReq`         | uid=1, pn=6, rn=7, common=9          |
| 发帖选吧搜索   | `c/f/forum/searchPostForum` | `tbclient.SearchPostForum.DataReq` | common=1, word=2                     |

另观察到 `c/f/pb/page?cmd=302001&format=protobuf` 和 `c/f/frs/page?cmd=301001&format=protobuf` 字符串；不能据此断定所有请求都使用这些 cmd，也不能认为同一路径的不同 cmd 可互换。

`CommonReq.BDUSS` 的 tag 为 10，仅记录字段定义，未读取或保存任何账号 BDUSS。是否允许匿名、哪些公共字段必填仍未知。

## 工具与待完成工作

Windows 本机 Node.js 24.16.0、npm 11.13.0、完整 JDK 25.0.1 可用。REA 6.4.0 已安装在忽略目录 `.local/rea-runtime`，`--version` 和 Android 命令帮助已成功执行。REA 源码归档位于同级 `../rea`；Git 智能传输失败，因此该目录是源码快照，不包含克隆历史。

JADX 0.7.1 已完成下载并校验，SHA-256 为 `6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75` ，完整文件为 `.local/jadx-complete.jar`。

本机已成功执行 APK 检查；复查入口（仓库根目录，替换示例路径）：

```powershell
$env:REA_JADX_MCP_JAR = (Resolve-Path '.local/jadx-complete.jar').Path
node .local/rea-runtime/node_modules/rea-agents/scripts/rea.mjs inspect-android-package 'D:/targets/example.apk' --format json
```

APK 路径为示例。后续依次追踪 `FrsPageRequestMessage`、`PbPageRequestMessage`、序列化和网络发送边界，确认 URL、HTTP 方法、公共参数、签名输入、请求体及响应 Protobuf。再以少量读取请求验证分页和错误行为，并实现 SDK。

## 验证边界

已对真实 APK 完成路径和字段提取。提取器通过重复源位置、路径误匹配、截断 DEX 和未知 DEX 版本测试。

REA/JADX 已成功检查包名 `com.baidu.tieba`、版本 `22.13.1.1`、52,181 个类和 10,941 个资源，摘要及父 Evidence ID 见 [APK 摘要](../evidence/apk-summary.json)。已成功读取 `FrsPageRequestMessage` 的成员及构造函数；构造函数引用 cmd `301001`，包含 Titan 热修复拦截分支，不能将静态逻辑等同于当前运行路径。尚未完成完整调用链、APK 签名验证、线上接口请求、登录或设备测试。没有运行目标 App，也没有发送发帖、回复、关注或私信操作。

## 实际参考资料

- [cv-cat/DouYin_Spider README](https://github.com/cv-cat/DouYin_Spider/blob/master/README.md)：参考接口、登录和示例的组织方式。
- [cv-cat 的接口实现](https://github.com/cv-cat/DouYin_Spider/blob/master/dy_apis/douyin_api.py)：参考认证、参数构造、传输及响应解析分离；未复制其代码，也不以抖音协议推断贴吧协议。
- [REA Android 分析指南](https://github.com/Billy775326/rea/blob/main/docs/android-analysis.md)：工具前提、调用方式及证据边界。

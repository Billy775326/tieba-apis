# 贴吧 App 读取接口线上验证

> 历史 App 研究：本文冻结首批 App Protobuf 读取验证，不是 PC 网页接口测试；路径、命令和计数保持当时记录。当前网页功能见 [README 功能表](../README.md#功能)，参数与验收见 [PC 网页指南](pc-web-validation.md)。

本次以贴吧 Android 22.13.1.1 APK 中提取的路径、请求字段和命令号构造最小匿名 Protobuf 请求，实际访问 `https://tiebac.baidu.com`。2026-11-13 香港时间 21:52 完成 7 次请求：6 次读取检查通过，1 次空请求负对照符合预期。完整观测时间和响应摘要见 [线上验证报告](../evidence/live-read-validation.json)。

## 通过范围

请求方法均为 POST，URL 包含 `cmd` 与 `format=protobuf`，通过 multipart 的 `data` 字段发送 Protobuf。每个读取结果都要求响应中的显式 `errorno=0` 和对应对象检查通过；单独收到 HTTP 200 不算通过。

| 读取能力       | 路径                        | cmd    | 本次核对                                                 |
| -------------- | --------------------------- | ------ | -------------------------------------------------------- |
| 帖子列表与分页 | `c/f/frs/page`              | 301001 | 返回 python 吧；请求第 1、2 页分别返回相同页码并包含帖子 |
| 帖子详情       | `c/f/pb/page`               | 302001 | 返回的帖子编号与列表选择的编号一致，包含回复记录         |
| 楼中楼         | `c/f/pb/floor`              | 302002 | 返回数据中的父回复编号与请求一致                         |
| 公开用户资料   | `c/u/user/profile`          | 303012 | 返回用户编号与选定公开回复的作者编号一致                 |
| 发帖选吧搜索   | `c/f/forum/searchPostForum` | 309466 | 精确结果的吧名为 python；这是选吧搜索，不是全站帖子搜索  |

空请求对照同样收到 HTTP 200，但 Protobuf 返回 `errorno=3`、提示该吧未建立，未返回数据。这证明需要解析业务状态。补充正确 cmd 后，楼中楼和选吧搜索才按本次请求返回预期 Protobuf；不能把无 cmd 的 JSON 空壳响应当作成功。

本次列表请求设置 `rn=2`，实际两页返回 13 和 30 条列表记录，验证器没有把 rn 当作硬性返回上限。这里只确认 pn 对应的返回页码，尚未确认列表排序稳定性、重复条目或广告处理。

## 复现

需要 Node.js 24+，在本仓库根目录运行，无需 APK、Java、REA 或额外 npm 依赖。先前的 APK 提取结果已固化到验证器及证据文件中。

```powershell
node --test tests/*.test.mjs
node scripts/verify-app-reads.mjs --live
```

验证器会发送上述 7 次匿名读取或负对照请求，默认每次总超时 12 秒、响应上限 1 MiB。结果写入 `.local/verified-reads.json`，原始响应留在忽略目录 `.local/`。全部读取检查及负对照通过时退出 0，未完成或不通过时退出 2。该脚本取公开吧的当前帖子作为后续样本，帖子被删除、回复不可见或网络故障可能使链路中断；应查看具体阶段，不应跳过断言。

`node scripts/verify-read-api.mjs --live` 仅进行两次空 POST 连通性诊断，不等同于业务验证。验证工具拒绝 Cookie 或 Authorization 参数。

## 证据与限制

- [请求链路摘要](../evidence/http-request-chain.json)：REA 方法 Evidence ID、源码文本哈希和命令号来源。
- [响应字段元数据](../evidence/response-validation-fields.json)：本次解码与对象匹配使用的 APK 字段编号、类和字段索引。
- [线上结果](../evidence/live-read-validation.json)：状态码、业务码、语义检查、响应字节数和 SHA-256；不提交原始用户资料、帖子内容或账号标识。

本次没有使用 Cookie、BDUSS、设备标识或请求签名，验证的是这组最小匿名读取请求。不能据此推断登录接口、写入接口或其他版本不需要签名。HTTP 发送方法的部分实现未获得可用反编译体，因此 multipart 构造的依据包括本次真实返回，而不是 App 原始请求逐字节对照。

本页仅记录首批匿名样本，不是完整 SDK、设备抓包或长期可用性保证。此后已进行扩展读取和官方网页扫码登录验证，见 [全量覆盖报告](full-coverage.md)；App 身份匹配、写入及其他未覆盖场景仍不能据此判为通过。本次不更新正式版本或发布标签。

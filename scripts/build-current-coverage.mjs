import fs from 'node:fs';
import { consolidate, isFunctional } from '../src/validation-status.mjs';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const base = read('evidence/api-coverage.json');
const observations = [];
function add(o, source, status, command, fallbackTime) {
  observations.push({ path: o.path, command: command ?? o.command ?? null, observed_at_utc: o.observed_at_utc ?? fallbackTime ?? null, status: status ?? o.status ?? 'unconfirmed', error_code: o.error_code ?? null, ...(o.error_message ? {error_message:o.error_message} : {}), ...(o.checks ? {checks:o.checks} : {}), ...(o.candidate_ids?{candidate_ids:o.candidate_ids}:{}), http_status:o.http_status??null, response_sha256:o.response_sha256??null, phase:o.phase??null, condition:o.condition??null, negative_control:o.negative_control??false, authenticated:o.authenticated??null, missing_fixture:o.missing_fixture??null, incomplete_cleanup:o.incomplete_cleanup??false, transport_upgraded_from_http:o.transport_upgraded_from_http??false, input_fields:o.input_fields??null, omitted_fields:o.omitted_fields??null, source });
}
const thread = read('evidence/thread-fixture-read-validation.json');
for (const o of thread.results) add(o, 'evidence/thread-fixture-read-validation.json', o.status, null, thread.observed_at_utc);
const write = read('evidence/thread-fixture-write-validation.json');
for (const o of write.operations) {
  const changed = ['create-parent','create-child','delete-parent','delete-child'].includes(o.name);
  const readChecked = o.checks && Object.values(o.checks).every(v=>v===true);
  add(o, 'evidence/thread-fixture-write-validation.json', o.error_code === '0' && changed && write.result.created_items_absent_after_delete ? 'verified-state-change' : readChecked && o.error_code==='0' ? 'verified-read' : o.status, o.path==='c/c/post/add'?'309731':o.path==='c/f/pb/getPostList'?'309446':o.path==='c/f/pb/floor'?'302002':o.path==='c/f/pb/page'?'302001':null);
}
const two = read('evidence/two-account-validation.json');
for (const o of two.operations) {
  const changed = /\/user\/(?:un)?follow$/.test(o.path);
  const checked = o.checks && Object.values(o.checks).every(v=>v===true);
  add(o, 'evidence/two-account-validation.json', o.error_code==='0' && changed && two.result.initial_relationship_restored ? 'verified-state-change' : o.error_code==='0' && checked ? 'verified-read' : o.status, o.path==='c/u/user/profile'?'303012':o.path==='c/u/user/getPrivateInfo'?'303016':null);
}
const gap = read('evidence/gap-validation.json');
if (gap.artifact.sha256 !== base.artifact.sha256) throw Error('Artifact mismatch');
for (const o of gap.results) add(o, 'evidence/gap-validation.json');
for (const o of gap.same_value_control.operations) add(o, 'evidence/gap-validation.json', 'business-success');
for (const o of gap.permission_cycle.operations) add(o, 'evidence/gap-validation.json', o.error_code==='0' && gap.permission_cycle.restored && gap.permission_cycle.changed_verified ? o.namespace==='SetUserBlack'?'verified-state-change':'verified-read' : 'unconfirmed');
const comprehensive=read('evidence/comprehensive-validation.json');
for (const phase of comprehensive.phases) {
  if(phase.name==='media-origin-control')continue;
  for(const raw of phase.results) {
    if(!raw.path)continue;
    const o={...raw,phase:phase.name};
    let status=o.status??'unconfirmed', command=o.command;
    if(phase.name==='media-probes'&&o.status==='verified-image-response')status=o.transport_upgraded_from_http?'https-variant-verified':'verified-read';
    if(phase.name==='web-routes'&&o.candidate_ids?.some(id=>base.rows.find(r=>r.id===id)?.explicit_origin?.startsWith('http:')))o.transport_upgraded_from_http=true;
    if(phase.name==='controlled-cycles') {
      const cycle=comprehensive.cycles.find(c=>c.name===o.cycle);
      const readChecked=['verify-changed','verify-added','verify-followed','verify-restored','verify-restored-late','baseline'].includes(o.name);
      const successfulChange=cycle?.observable_transition_verified&&cycle?.baseline_restored;
      status=o.error_code!=='0'?'business-error':readChecked&&successfulChange?'verified-read':successfulChange?'verified-state-change':'business-success';
    }
    if(phase.name==='own-main-thread-cycle') {
      if(o.name==='create') { o.incomplete_cleanup=!comprehensive.main_thread.content_fully_absent; status=comprehensive.main_thread.creation_verified?'verified-state-change':'business-success';command='309730'; }
      else if(o.name==='delete'){o.incomplete_cleanup=!comprehensive.main_thread.content_fully_absent;status=comprehensive.main_thread.delete_acknowledged&&comprehensive.main_thread.anonymous_thread_error_code==='4'?'verified-state-change':'business-success';}
      else if(o.name==='read')status=comprehensive.main_thread.creation_verified?'verified-read':'business-success';
      else if(o.name==='delete-first-post'){status='business-error';o.condition='cleanup of first floor after own main thread deletion';}
      else if(o.error_code&&o.error_code!=='0') {status='expected-deletion-response';o.negative_control=true;}
      else status=o.status??'business-success';
      if(o.path==='c/f/pb/page')command='302001';
      if(o.path==='c/f/pb/getPostList')command='309446';
    }
    add(o,'evidence/comprehensive-validation.json',status,command,comprehensive.phases.at(-1)?.results?.[0]?.observed_at_utc);
  }
}
const supplemental=read('evidence/supplemental-validation.json');
if(supplemental.artifact.sha256!==base.artifact.sha256)throw Error('Supplemental artifact mismatch');
for(const phase of supplemental.phases) for(const o of phase.results) if(o.path) add({...o,phase:phase.name},'evidence/supplemental-validation.json');
const expanded=read('evidence/expanded-api-validation.json');
if(expanded.artifact.sha256!==base.artifact.sha256)throw Error('Expanded API artifact mismatch');
for(const phase of expanded.phases)for(const o of phase.results)if(o.path)add({...o,phase:phase.name},'evidence/expanded-api-validation.json');
const deepDiscovery=read('evidence/deep-discovery-validation.json');
if(deepDiscovery.artifact.sha256!==base.artifact.sha256)throw Error('Deep discovery artifact mismatch');
for(const o of deepDiscovery.results)if(o.origin!=='https://pim.baidu.com')add(o,'evidence/deep-discovery-validation.json');
const continued=read('evidence/continued-discovery-validation.json');
if(continued.artifact.sha256!==base.artifact.sha256)throw Error('Continued discovery artifact mismatch');
for(const phase of continued.phases)if(phase.transport==='https')for(const o of phase.results)
  if(o.path&&!o.origin)add({...o,phase:phase.name},'evidence/continued-discovery-validation.json');
const references=read('evidence/endpoint-reference-summary.json');
observations.sort((a,b)=>(a.observed_at_utc??'').localeCompare(b.observed_at_utc??''));
for (const report of [thread, write, two, gap, comprehensive, references]) {
  if ((report.artifact?.sha256 ?? report.artifact_sha256) !== base.artifact.sha256) throw Error('Supplemental artifact mismatch');
}
function nextBusinessTest(row) {
  if(row.validation_tier!=='anonymous-diagnostic-only')return null;
  const fields=[...new Set([...row.construction_review.declared_request_field_names,...row.construction_review.field_name_clues])];
  let kind='request-construction-needed',reason='完整请求语义与业务断言尚未恢复，这是待分析工作，尚不能认定服务端限制。';
  if(/delall|clear.*user|cancelaccount|closeaccount/i.test(row.path)){kind='dedicated-account-fixture';reason='完整操作会清空或关闭账号；当前两份网页登录态不代表可销毁数据的专用账号。仅做了无凭据诊断。';}
  else if(/consume|alipay|buy|pay|order/i.test(row.path)){kind='order-or-payment-fixture';reason='尚无隔离订单、支付沙箱或明确金额与标的；普通网页登录态不能替代完整交易对象。业务测试待完成。';}
  else if(row.path==='/c/s/clientcall'){kind='controlled-phone-target';reason='APK 构造包含 tid、phonenum、optype；尚无该流程的受控电话号码与操作约定。';}
  else if(row.path==='/c/e/meme/collect'){kind='collection-replacement-and-restore';reason='APK 将完整序列化收藏列表上传，空列表传 all_delete；需确认完整对象格式与精确恢复，不能把参数缺失当作无害读取。';}
  else if(/chat|msg|sprite|aigame/i.test(row.path)){kind='specific-conversation-or-ai-fixture';reason='需恢复该 HTTP 业务的会话、聊天室、机器人或消息对象和清理步骤；现有普通 IM 与 SDK 群的成功不能自动验证此路径。';}
  else if(/voice|live|activity|quiz|poll|adoptAnswer/i.test(row.path)){kind='domain-object-and-cleanup';reason='尚缺该路径的有效语音/视频、房间、活动、投票或问答对象及完整请求/清理核对。现有普通帖子不是这些专用对象。';}
  else if(row.category==='telemetry-or-state'){kind='event-contract-and-observation';reason='仅验证匿名空事件的返回；尚未恢复真实事件语义、字段与服务端可观测验收条件。';}
  else if(row.category==='stateful-or-auth-action'||/exczan|userPk/.test(row.path)){kind=fields.length?'owned-object-and-rollback':'request-and-rollback-construction';reason='业务写入的完整参数、受控对象、基线或恢复步骤仍需逐项建立；现有匿名返回不证明该账号无法使用。';}
  return {kind,basis:'analysis',request_fields_seen:fields,reason};
}
const selfDeletePaths=new Set(['/c/c/bawu/delthread','/c/c/bawu/delpost']);
const rows = base.rows.map(r=>{
  const scoped={...r};
  if((/bawu|manger|manager|election|banid|setgood|settop/i.test(r.path)||r.path==='/c/f/forum/forumRuleDraft')&&!selfDeletePaths.has(r.path))scoped.execution_scope='moderation-excluded-by-user';
  const row=consolidate(scoped, observations);
  const ref=references.rows.find(x=>x.id===row.id);
  row.construction_review={direct_reference_count:ref.direct_reference_count,http_command_hypotheses:ref.http_command_hypotheses,declared_request_field_names:ref.declared_request_field_names,field_name_clues:[...new Set(ref.http_request_sites.flatMap(x=>x.field_name_clues))],source:'evidence/endpoint-reference-summary.json'};
  const all=[...(row.attempts??[]),...row.supplemental_observations];
  row.execution_status=row.verified_url||all.some(o=>o.response_sha256||Number.isInteger(o.http_status))?'http-response-recorded':all.some(o=>['transport-error','transport-incomplete'].includes(o.status))?'network-attempt-incomplete':'not-requested';
  row.disposition=row.category==='nonproduction-or-other-origin'?'outside-production-scope':row.execution_scope==='moderation-excluded-by-user'?'excluded-by-user':row.execution_status==='not-requested'?'blocked-not-executed':'tested-with-recorded-result';
  row.validation_tier=row.disposition==='excluded-by-user'?'excluded-by-user':row.category==='nonproduction-or-other-origin'?'other-origin':isFunctional(row.best_status)?'functionally-verified':row.category==='web-route'&&row.execution_status==='http-response-recorded'?'web-route-response-recorded':row.latest_observation?.negative_control?(row.latest_observation.authenticated===true?'parameter-diagnostic-only':'anonymous-diagnostic-only'):row.execution_status==='http-response-recorded'?'business-validation-incomplete':'not-requested';
  row.next_business_test=nextBusinessTest(row);
  return row;
});
const count = key => Object.fromEntries([...new Set(rows.map(r=>r[key]))].sort().map(v=>[v,rows.filter(r=>r[key]===v).length]));
const reasons = Object.fromEntries([...new Set(rows.map(r=>r.limitation.kind))].sort().map(v=>[v,rows.filter(r=>r.limitation.kind===v).length]));
const summary = {candidates:rows.length,unique_paths:new Set(rows.map(r=>r.path)).size,functionally_verified_candidates:rows.filter(r=>isFunctional(r.best_status)).length,other_candidates:rows.filter(r=>!isFunctional(r.best_status)).length,best_statuses:count('best_status'),execution_statuses:count('execution_status'),validation_tiers:count('validation_tier'),dispositions:count('disposition'),limitations:reasons};
const pendingKinds=Object.fromEntries([...new Set(rows.flatMap(r=>r.next_business_test?[r.next_business_test.kind]:[]))].sort().map(k=>[k,rows.filter(r=>r.next_business_test?.kind===k).length]));
summary.business_tests_pending=pendingKinds;
const report = {schema_version:1,artifact:base.artifact,evidence_cutoff_utc:observations.at(-1).observed_at_utc,scope:'All static candidates plus explicitly matched supplemental observations; reasons distinguish observations from pending analysis',summary,rows};
fs.writeFileSync('evidence/current-api-coverage.json',JSON.stringify(report,null,2)+'\n');
const quote = v => '"'+String(v??'').replaceAll('"','""')+'"';
const columns=['id','path','command_variant','historical_status','best_status','validation_tier','execution_status','disposition','latest_error_code','limitation_kind','limitation_basis','limitation_reason','next_business_test_kind','next_business_test_reason','request_field_clues'];
const csv=[columns.join(','),...rows.map(r=>[r.id,r.path,r.command_variant,r.historical_status,r.best_status,r.validation_tier,r.execution_status,r.disposition,r.latest_observation?.error_code,r.limitation.kind,r.limitation.basis,r.limitation.reason,r.next_business_test?.kind,r.next_business_test?.reason,r.next_business_test?.request_fields_seen.join('|')].map(quote).join(','))].join('\n')+'\n';
fs.writeFileSync('docs/current-api-coverage.csv',csv);
const reasonRows=Object.entries(reasons).map(([kind,n])=>{const r=rows.find(r=>r.limitation.kind===kind);return '| '+kind+' | '+n+' | '+r.limitation.basis+' | '+r.limitation.reason+' |'}).join('\n');
const failures=gap.results.filter(r=>r.status==='business-error').map(r=>'| '+r.path+' | '+r.error_code+' | '+(r.error_message||'未给出明确原因')+' | '+(r.error_code==='2121024'?'当前账号不是吧务，服务端明确说明。':'原因未定位；不能把内部/系统错误直接解释为登录失效或会员不足。')+' |').join('\n');
const doc=`# 当前验证范围与未完成原因

> 历史 App 覆盖汇总：本页只合并固定 APK 范围内的已保存 App 观测，不包含 PC 网页验收。当前网页功能见 [README 功能表](../README.md#功能)，网页结果与限制见 [PC 指南](pc-web-validation.md) 和 [PC CSV](pc-web-api-coverage.csv)。

本页合并该 App 范围的已保存观测，覆盖 **${summary.candidates} 条静态候选、${summary.unique_paths} 个不同路径**。${summary.functionally_verified_candidates} 条候选已有对象或状态变化核对；其余候选不能一概当作失败。已有 HTTP 返回、尚未发出请求、按用户要求不再测的项目分别列出，状态登记不等于实测完成。

逐项结果见 [CSV](current-api-coverage.csv) 和 [JSON](../evidence/current-api-coverage.json)。CSV 同时列出 execution_status、disposition、历史最强证据及最新限制；未执行项目明确保留 not-requested。

## 新增请求契约与 SDK 方法

客户端从 5 个方法扩展到 12 个。本阶段另记录 **${expanded.total_requests} 次请求**，其中移除一个受控粉丝、帖子点赞与取消均经独立读取核对并恢复原状态；轮询只完成首页订阅返回结构核对，商城 IM 列表为空。初次 GetTails 的响应标签解析失败也保留在报告内，修正后已复测。见 [新增接口实测](expanded-api-validation.md) 和 [脱敏证据](../evidence/expanded-api-validation.json)。这些请求不计入下方冻结的历史阶段总数。

## 全 APK 静态扫描与新增读取

完整网络面、Socket 请求与所有 Wire 声明单列在 [APK 接口清单](network-inventory.md)，不把 URL/资源候选和原有 603 条覆盖行直接相加。本阶段另有 ${deepDiscovery.total_requests} 次读取：两个受控账号的 IM 身份与此前 IM 登录结果一致，公开查询函数复测通过；本人回复通知只完成非空结构核对。见 [脱敏记录](../evidence/deep-discovery-validation.json)。这些结果不表示全部候选均已可调用。

## 原生 Socket 与继续验证

本阶段新增 **${continued.counts.total_requests} 次业务/媒体请求**：${continued.counts.http_business_or_media_requests} 次 HTTP 与 ${continued.counts.app_socket_requests} 次 App Socket 消息；另有 ${continued.counts.transport_handshake_attempts} 次握手探测。黑名单、单个会话提醒开关观察到变化且恢复；10 个命令逐项区分对象核对、结构确认、空样本和本地解析失败。Socket 命令没有并入 603 条 HTTP 候选，也没有猜测对应 HTTP 路径。见 [原生 Socket 实测](app-socket-validation.md) 与 [脱敏报告](../evidence/continued-discovery-validation.json)。

## 后续逐项补测

新增 **${supplemental.total_requests} 次请求**，其中 203 次为匿名空请求诊断（含 1 次公开入口检查），其余为登录态或明确参数的业务读取、受控小尾巴流程及图片内容对照。详见 [补测记录](supplemental-validation.md) 与 [脱敏证据](../evidence/supplemental-validation.json)。**匿名诊断不能当作业务通过，也不能证明当前账号权限不足。**

| validation_tier | 候选数 |
| --- | --- |
${Object.entries(summary.validation_tiers).map(([s,n])=>'| '+s+' | '+n+' |').join('\n')}

## 先前读取计划与状态验证

此前阶段共记录 **${comprehensive.total_requests} 次请求**，见 [完整报告](../evidence/comprehensive-validation.json)。151 条网页候选去重后 147 次匿名 GET，全部现有协议读取计划 70 项、遗留读取计划 123 项也已执行；另有 7 项检查和有界重试、媒体对照、受控状态闭环及用户新提供测试吧的主帖测试。这里的“计划已执行”不表示每项都使用了完整参数或业务验收通过。

收藏/取消收藏、图片水印和消息屏蔽标志、关注/取消关注贴吧均观察到状态变化并恢复原值。取消关注的即时回查仍为已关注，约 46 秒后的回查恢复；原因未定位，不强称为缓存。隐私 opt=post 的有效请求 val=2 返回读取值 3，状态随后恢复原值；已验证变化/恢复，完整枚举映射仍未完成。最初 val=0 的拒绝作为参数诊断保留。

图片代理的响应包含 app:tiebaclient;type:0; 前缀。解析后得到 406×406 JPEG，并与同一官方缩略图源的当前响应摘要一致；这验证了本次代理传输，不证明原视频或原始分辨率可用。语音仅做了无 voice_md5 的负对照，仍没有有效语音样本。

## 测试主帖的删除限制

按用户链接，在测试吧（名称已移除）创建一条明确标记的测试主帖，作者、首楼编号、标题和正文标记均匹配。本人删除接口返回 0，随后账号内和匿名的主帖详情均返回 4。

**首楼按编号查询仍返回数据，进一步删除该首楼返回 230890。未通过“所有内容均不可读取”的清理验收，不能声称彻底清除。** 是否为缓存、软删除保留或其他机制尚未确定；没有继续发布新测试内容。具体编号、标记和原始响应保留在本机忽略目录，未提交。

删除本人新帖使用 bawu 命名路径及 delete_my_thread=1，不属于管理员删他人帖测试。用户已明确不测吧务，其他吧务候选列为 excluded-by-user，保留旧观测，不再要求提供吧务账号。

## 已确认的限制与尚未确认的原因

| 场景 | 实际返回或条件 | 结论 |
| --- | --- | --- |
| 用户屏蔽 userMuteAdd | 1990043，明确提示高级会员权限 | 当前账号权限不足；原屏蔽状态未变化 |
| 指定测试吧签到 | 160002，提示此前已签到 | 本轮没有新增签到成功，不是登录失效 |
| 主帖删除后的首楼清理 | 230890，删除贴子失败 | 主帖详情不可访问，但首楼编号查询仍有返回 |
| 用户文字指定的另一吧名 | 340001，服务端限制读取 | 未向该吧发帖；实际使用用户链接对应的测试吧（两者名称均已移除） |
| 部分会员、活动或配置查询 | 内部/系统/未知错误 | 仅保留业务码，不推断登录失效、封禁或限流 |
| 私信与 SDK 群聊 | 已完成双账号 IM 登录、双向发送和收件历史回读、本人撤回及清理 | 见 [IM 实测](im-validation.md)；不自动验证 HTTP 聊天室和直播群发 |
| 订单、支付、账号数据清空 | 无隔离订单或账号环境 | 未用真实扣款或清空账号来探测 |

本轮没有足够证据证明验证码或风控限制。匿名网页的 HTML、重定向和空正文也不作为客户端 API 功能通过。

## 全部候选的执行状态

| execution_status | 候选数 |
| --- | --- |
${Object.entries(summary.execution_statuses).map(([s,n])=>'| '+s+' | '+n+' |').join('\n')}

| disposition | 候选数 |
| --- | --- |
${Object.entries(summary.dispositions).map(([s,n])=>'| '+s+' | '+n+' |').join('\n')}

尚未发出有效请求的候选均有单独原因及 [APK 构造线索](../evidence/endpoint-reference-summary.json)。索引扫描了独立 JADX 节点枚举中的 ${references.methods_examined} 个方法，其中 ${references.methods_without_code} 个没有代码；${references.candidates_with_direct_references} 条候选有直接字面量引用，${references.candidates_without_direct_references} 条未找到。静态引用和字段线索不算线上测试，也不是完整参数语义。

## 限制分类

| 限制分类 | 候选数 | 证据性质 |
| --- | --- | --- |
${Object.entries(reasons).map(([s,n])=>'| '+s+' | '+n+' | '+rows.find(r=>r.limitation.kind===s).limitation.basis+' |').join('\n')}

observed 表示实际观测，analysis 表示协议、参数、样本或恢复条件仍待建立；user-request 表示用户排除范围，scope 表示未选择的来源。已经具备测试授权，未执行不会写成“未获授权”。具体原因逐项见 CSV。

## 离线重建与复测入口

在仓库根目录执行 node scripts/build-current-coverage.mjs 可从已保存的脱敏报告重建本页、CSV 和当前覆盖 JSON，不联网、不读取账号文件。node scripts/verify-web-routes.mjs --live 执行匿名网页路由分类；协议和遗留读取复测条件见 [历史全量文档](full-coverage.md)，新结果先保存在忽略目录再审核。

后续 [IM 实测](im-validation.md) 和 [脱敏记录](../evidence/im-validation.json) 已补齐普通私信及 SDK 群聊核心流程；相关 REST 路径和 LCP 方法独立于原 603 条字面量计数，未将成功结果迁移给相似命名的 HTTP 路径。

本页保留 [前轮缺口补测](../evidence/gap-validation.json)、[指定帖子](thread-validation.md) 和 [双账号测试](two-account-validation.md) 的历史记录，不静默覆盖旧观测。`;
fs.writeFileSync('docs/remaining-validation.md',doc);
console.log(JSON.stringify(summary));

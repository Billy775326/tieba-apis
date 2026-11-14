import fs from 'node:fs';
import { consolidate, isFunctional } from '../src/validation-status.mjs';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const base = read('evidence/api-coverage.json');
const observations = [];
function add(o, source, status, command, fallbackTime) {
  observations.push({ path: o.path, command: command ?? o.command ?? null, observed_at_utc: o.observed_at_utc ?? fallbackTime ?? null, status: status ?? o.status ?? 'unconfirmed', error_code: o.error_code ?? null, ...(o.error_message ? {error_message:o.error_message} : {}), ...(o.checks ? {checks:o.checks} : {}), ...(o.candidate_ids?{candidate_ids:o.candidate_ids}:{}), http_status:o.http_status??null, response_sha256:o.response_sha256??null, phase:o.phase??null, condition:o.condition??null, negative_control:o.negative_control??false, missing_fixture:o.missing_fixture??null, incomplete_cleanup:o.incomplete_cleanup??false, transport_upgraded_from_http:o.transport_upgraded_from_http??false, input_fields:o.input_fields??null, omitted_fields:o.omitted_fields??null, source });
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
const references=read('evidence/endpoint-reference-summary.json');
observations.sort((a,b)=>(a.observed_at_utc??'').localeCompare(b.observed_at_utc??''));
for (const report of [thread, write, two, gap, comprehensive, references]) {
  if ((report.artifact?.sha256 ?? report.artifact_sha256) !== base.artifact.sha256) throw Error('Supplemental artifact mismatch');
}
const selfDeletePaths=new Set(['/c/c/bawu/delthread','/c/c/bawu/delpost']);
const rows = base.rows.map(r=>{
  const scoped={...r};
  if(/bawu|manger|manager|election|banid|setgood|settop/i.test(r.path)&&!selfDeletePaths.has(r.path))scoped.execution_scope='moderation-excluded-by-user';
  const row=consolidate(scoped, observations);
  const ref=references.rows.find(x=>x.id===row.id);
  row.construction_review={direct_reference_count:ref.direct_reference_count,http_command_hypotheses:ref.http_command_hypotheses,declared_request_field_names:ref.declared_request_field_names,field_name_clues:[...new Set(ref.http_request_sites.flatMap(x=>x.field_name_clues))],source:'evidence/endpoint-reference-summary.json'};
  const all=[...(row.attempts??[]),...row.supplemental_observations];
  row.execution_status=row.verified_url||all.some(o=>o.response_sha256||Number.isInteger(o.http_status))?'http-response-recorded':all.some(o=>['transport-error','transport-incomplete'].includes(o.status))?'network-attempt-incomplete':'not-requested';
  row.disposition=row.execution_scope==='moderation-excluded-by-user'?'excluded-by-user':row.execution_status==='not-requested'?'blocked-not-executed':'tested-with-recorded-result';
  return row;
});
const count = key => Object.fromEntries([...new Set(rows.map(r=>r[key]))].sort().map(v=>[v,rows.filter(r=>r[key]===v).length]));
const reasons = Object.fromEntries([...new Set(rows.map(r=>r.limitation.kind))].sort().map(v=>[v,rows.filter(r=>r.limitation.kind===v).length]));
const summary = {candidates:rows.length,unique_paths:new Set(rows.map(r=>r.path)).size,functionally_verified_candidates:rows.filter(r=>isFunctional(r.best_status)).length,other_candidates:rows.filter(r=>!isFunctional(r.best_status)).length,best_statuses:count('best_status'),execution_statuses:count('execution_status'),dispositions:count('disposition'),limitations:reasons};
const report = {schema_version:1,artifact:base.artifact,evidence_cutoff_utc:observations.at(-1).observed_at_utc,scope:'All static candidates plus explicitly matched supplemental observations; reasons distinguish observations from pending analysis',summary,rows};
fs.writeFileSync('evidence/current-api-coverage.json',JSON.stringify(report,null,2)+'\n');
const quote = v => '"'+String(v??'').replaceAll('"','""')+'"';
const columns=['id','path','command_variant','historical_status','best_status','execution_status','disposition','latest_error_code','limitation_kind','limitation_basis','limitation_reason'];
const csv=[columns.join(','),...rows.map(r=>[r.id,r.path,r.command_variant,r.historical_status,r.best_status,r.execution_status,r.disposition,r.latest_observation?.error_code,r.limitation.kind,r.limitation.basis,r.limitation.reason].map(quote).join(','))].join('\n')+'\n';
fs.writeFileSync('docs/current-api-coverage.csv',csv);
const reasonRows=Object.entries(reasons).map(([kind,n])=>{const r=rows.find(r=>r.limitation.kind===kind);return '| '+kind+' | '+n+' | '+r.limitation.basis+' | '+r.limitation.reason+' |'}).join('\n');
const failures=gap.results.filter(r=>r.status==='business-error').map(r=>'| '+r.path+' | '+r.error_code+' | '+(r.error_message||'未给出明确原因')+' | '+(r.error_code==='2121024'?'当前账号不是吧务，服务端明确说明。':'原因未定位；不能把内部/系统错误直接解释为登录失效或会员不足。')+' |').join('\n');
const doc=`# 当前验证范围与未完成原因

本页合并全部已保存观测，覆盖 **${summary.candidates} 条静态候选、${summary.unique_paths} 个不同路径**。${summary.functionally_verified_candidates} 条候选已有对象或状态变化核对；其余候选不能一概当作失败。已有 HTTP 返回、尚未发出请求、按用户要求不再测的项目分别列出，状态登记不等于实测完成。

逐项结果见 [CSV](current-api-coverage.csv) 和 [JSON](../evidence/current-api-coverage.json)。CSV 同时列出 execution_status、disposition、历史最强证据及最新限制；未执行项目明确保留 not-requested。

## 本轮完整读取计划与新增写入测试

本轮共记录 **${comprehensive.total_requests} 次请求**，见 [完整报告](../evidence/comprehensive-validation.json)。151 条网页候选去重后 147 次匿名 GET，全部现有协议读取计划 70 项、遗留读取计划 123 项也已执行；另有 7 项检查和有界重试、媒体对照、受控状态闭环及用户新提供测试吧的主帖测试。这里的“计划已执行”不表示每项都使用了完整参数或业务验收通过。

收藏/取消收藏、图片水印和消息屏蔽标志、关注/取消关注贴吧均观察到状态变化并恢复原值。取消关注的即时回查仍为已关注，约 46 秒后的回查恢复；原因未定位，不强称为缓存。隐私 opt=post 的有效请求 val=2 返回读取值 3，状态随后恢复原值；已验证变化/恢复，完整枚举映射仍未完成。最初 val=0 的拒绝作为参数诊断保留。

图片代理的响应包含 app:tiebaclient;type:0; 前缀。解析后得到 406×406 JPEG，并与同一官方缩略图源的当前响应摘要一致；这验证了本次代理传输，不证明原视频或原始分辨率可用。语音仅做了无 voice_md5 的负对照，仍没有有效语音样本。

## 测试主帖的删除限制

按用户链接，在“[redacted-forum-name]”创建一条明确标记的测试主帖，作者、首楼编号、标题和正文标记均匹配。本人删除接口返回 0，随后账号内和匿名的主帖详情均返回 4。

**首楼按编号查询仍返回数据，进一步删除该首楼返回 230890。未通过“所有内容均不可读取”的清理验收，不能声称彻底清除。** 是否为缓存、软删除保留或其他机制尚未确定；没有继续发布新测试内容。具体编号、标记和原始响应保留在本机忽略目录，未提交。

删除本人新帖使用 bawu 命名路径及 delete_my_thread=1，不属于管理员删他人帖测试。用户已明确不测吧务，其他吧务候选列为 excluded-by-user，保留旧观测，不再要求提供吧务账号。

## 已确认的限制与尚未确认的原因

| 场景 | 实际返回或条件 | 结论 |
| --- | --- | --- |
| 用户屏蔽 userMuteAdd | 1990043，明确提示高级会员权限 | 当前账号权限不足；原屏蔽状态未变化 |
| 指定测试吧签到 | 160002，提示此前已签到 | 本轮没有新增签到成功，不是登录失效 |
| 主帖删除后的首楼清理 | 230890，删除贴子失败 | 主帖详情不可访问，但首楼编号查询仍有返回 |
| 文字名称“[redacted-alternate-forum-name]”的读取 | 340001，服务端限制读取 | 未向该吧发帖；实际使用链接对应的“[redacted-forum-name]” |
| 部分会员、活动或配置查询 | 内部/系统/未知错误 | 仅保留业务码，不推断登录失效、封禁或限流 |
| 私信及群聊 | IM 登录、封装与接收链路未完成；没有受控群 | 未发送私信，未宣称收发可用 |
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

本页保留 [前轮缺口补测](../evidence/gap-validation.json)、[指定帖子](thread-validation.md) 和 [双账号测试](two-account-validation.md) 的历史记录，不静默覆盖旧观测。`;
fs.writeFileSync('docs/remaining-validation.md',doc);
console.log(JSON.stringify(summary));

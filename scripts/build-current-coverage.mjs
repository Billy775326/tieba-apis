import fs from 'node:fs';
import { consolidate, isFunctional } from '../src/validation-status.mjs';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const base = read('evidence/api-coverage.json');
const observations = [];
function add(o, source, status, command, fallbackTime) {
  observations.push({ path: o.path, command: command ?? o.command ?? null, observed_at_utc: o.observed_at_utc ?? fallbackTime ?? null, status: status ?? o.status ?? 'unconfirmed', error_code: o.error_code ?? null, ...(o.error_message ? {error_message:o.error_message} : {}), ...(o.checks ? {checks:o.checks} : {}), source });
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
observations.sort((a,b)=>(a.observed_at_utc??'').localeCompare(b.observed_at_utc??''));
for (const report of [thread, write, two, gap]) {
  if ((report.artifact?.sha256 ?? report.artifact_sha256) !== base.artifact.sha256) throw Error('Supplemental artifact mismatch');
}
const rows = base.rows.map(r=>consolidate(r, observations));
const count = key => Object.fromEntries([...new Set(rows.map(r=>r[key]))].sort().map(v=>[v,rows.filter(r=>r[key]===v).length]));
const reasons = Object.fromEntries([...new Set(rows.map(r=>r.limitation.kind))].sort().map(v=>[v,rows.filter(r=>r.limitation.kind===v).length]));
const summary = {candidates:rows.length,unique_paths:new Set(rows.map(r=>r.path)).size,functionally_verified_candidates:rows.filter(r=>isFunctional(r.best_status)).length,other_candidates:rows.filter(r=>!isFunctional(r.best_status)).length,best_statuses:count('best_status'),limitations:reasons};
const report = {schema_version:1,artifact:base.artifact,evidence_cutoff_utc:observations.at(-1).observed_at_utc,scope:'All static candidates plus explicitly matched supplemental observations; reasons distinguish observations from pending analysis',summary,rows};
fs.writeFileSync('evidence/current-api-coverage.json',JSON.stringify(report,null,2)+'\n');
const quote = v => '"'+String(v??'').replaceAll('"','""')+'"';
const columns=['id','path','command_variant','historical_status','best_status','latest_error_code','limitation_kind','limitation_basis','limitation_reason'];
const csv=[columns.join(','),...rows.map(r=>[r.id,r.path,r.command_variant,r.historical_status,r.best_status,r.latest_observation?.error_code,r.limitation.kind,r.limitation.basis,r.limitation.reason].map(quote).join(','))].join('\n')+'\n';
fs.writeFileSync('docs/current-api-coverage.csv',csv);
const reasonRows=Object.entries(reasons).map(([kind,n])=>{const r=rows.find(r=>r.limitation.kind===kind);return '| '+kind+' | '+n+' | '+r.limitation.basis+' | '+r.limitation.reason+' |'}).join('\n');
const failures=gap.results.filter(r=>r.status==='business-error').map(r=>'| '+r.path+' | '+r.error_code+' | '+(r.error_message||'未给出明确原因')+' | '+(r.error_code==='2121024'?'当前账号不是吧务，服务端明确说明。':'原因未定位；不能把内部/系统错误直接解释为登录失效或会员不足。')+' |').join('\n');
const doc=`# 当前验证范围与未完成原因

本页合并历史覆盖及 2026-11-14 的指定帖、双账号和缺口补测，覆盖全部 **${summary.candidates} 条静态候选、${summary.unique_paths} 个不同路径**。按候选计，${summary.functionally_verified_candidates} 条已有对象或状态变化核对，另外 ${summary.other_candidates} 条尚未完成该层级验收。后者包括已有数据或结构返回的接口，不能直接称为不可用。

逐项列表见 [CSV](current-api-coverage.csv)，包括历史状态、最强证据、最近业务码和限制原因；完整尝试来源见 [JSON](../evidence/current-api-coverage.json)。同一路径不同 cmd 不串用验证结果。历史成功和后续失败分别保留，不能用“曾经成功”掩盖最近失败。

## 本轮线上补测

本轮共 37 次请求：25 次面向 APK 候选的读取、10 次受控账号权限设置/回查，以及 2 次错误路径构造诊断。原始响应仅在本机；脱敏观测见 [补测报告](../evidence/gap-validation.json)。

读取结果为：11 项响应结构核对、6 项返回非空 JSON、1 项按编号主题读取功能核对、2 项成功但为空、5 项业务错误。修正本人/测试账号编号、补入 thread_ids 或使用实际吧名后，部分旧错误得以消除。这些是本轮具体请求的结果，不等于所有参数组合均受支持。

账号 1 对账号 2 的 PermissionList.follow/interact/chat 从原值写为测试值，回查确认三个值变化，再全部恢复原值并回查确认；因此验证的是权限写入及恢复。is_black_white 在该过程中保持不变，不能把它直接理解为当前目标是否被屏蔽。没有通过实际私信或关注验证每个权限开关的下游效果。首次同值写入只作为未发生变化的对照保留，未计为状态变化通过。

UserPost 返回了帖子列表，但 author 对象缺少用户编号，本轮不将其升级为身份匹配的功能通过。动态列表只返回分页信息且没有帖子，保留空结果。会员任务和收藏提醒的两次早期同名路径假设不在 APK 路径表内，分别按 /c/e/point/getmembertasklist 和 /c/f/livegroup/getStoreRemindTime 修正后得到响应；错误路径单独保留，不归咎于真实接口。

## 本轮实际被拒绝的请求

| 路径 | 业务码 | 服务端说明 | 已知限制 |
| --- | --- | --- | --- |
${failures}

本轮没有取得能证明验证码、限流或账号封禁的返回；不能将其他错误归类为风控。表中的“内部错误”“系统错误”只支持服务端未接受当前请求，根因仍待分析。

## 所有候选的剩余限制

下表按候选计数，包含已验证项的适用范围。basis=observed 表示实际响应或核对结果，analysis 表示尚待解决的分析/资源条件，scope 表示本轮没有选择该来源；analysis 不是服务端拒绝的证据。测试授权已经具备，未执行不会笼统归因为未授权。

| 限制分类 | 候选数 | 证据性质 | 原因与范围 |
| --- | --- | --- | --- |
${reasonRows}

私信仍需恢复 IM 登录及 uk 映射、普通单聊封装和接收/历史查询；网页扫码不等于已恢复这套协议。当前未向两个账号发送私信。主帖、吧务、媒体/群聊/活动和支付或账号数据相关项目还需各自有效样本、权限或隔离环境，逐项原因在 CSV 中列出，不能把一个帖子替代所有场景。

## 离线重建

在仓库根目录执行 node scripts/build-current-coverage.mjs，读取已保存的脱敏证据，重新生成本页、CSV 和当前覆盖 JSON；该命令不联网，不读取账号文件，不发送真实操作。它保留 [历史全量报告](full-coverage.md) 的计数和原始快照。私信 IM 方法等未落在 603 个静态候选中的新线索，仍单独见 [双账号验证](two-account-validation.md)。
`;
fs.writeFileSync('docs/remaining-validation.md',doc);
console.log(JSON.stringify(summary));

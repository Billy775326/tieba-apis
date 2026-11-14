const levels = { 'verified-read': 100, 'verified-state-change': 100, 'response-schema-validated': 60, 'https-variant-verified': 60, 'json-data-returned': 50, 'html-page-response': 40, 'accepted-empty-response': 35, 'business-error': 30, 'redirect-response': 20, 'empty-response': 15, 'non-media-response': 15, 'json-response-unverified': 15, 'response-fields-recognized': 15, 'response-decode-failed': 10, 'unrecognized-business-status': 10, 'non-json-response': 10, 'transport-incomplete': 5, 'transport-error': 5 };
export function matchesObservation(row, observation) {
  if (row.category === 'nonproduction-or-other-origin') return false;
  if (Array.isArray(observation.candidate_ids) && !observation.candidate_ids.includes(row.id)) return false;
  if (row.path !== '/' + observation.path.replace(/^\//, '')) return false;
  if (row.command_variant != null) return String(row.command_variant) === String(observation.command);
  return !observation.command || !row.constructor_commands?.length || row.constructor_commands.map(String).includes(String(observation.command));
}
export function isFunctional(status) { return ['verified-read', 'verified-state-change'].includes(status); }
export function consolidate(row, observations) {
  const matches = observations.filter(o => matchesObservation(row, o));
  let best = row.status;
  for (const o of matches) if ((levels[o.status] ?? 0) > (levels[best] ?? 0)) best = o.status;
  const latest = matches.filter(o=>!o.negative_control).at(-1) ?? matches.at(-1) ?? row.attempts?.at(-1) ?? null;
  return { ...row, historical_status: row.status, best_status: best, latest_observation: latest, supplemental_observations: matches, limitation: restriction(row, best, latest) };
}
export function restriction(row, best, latest) {
  if (row.execution_scope === 'moderation-excluded-by-user') return {kind:'not-in-requested-scope',basis:'user-request',reason:'用户已明确不测吧务；保留先前观测，不将其作为本轮待取得授权的任务。'};
  if (latest?.error_code != null && String(latest.error_code) !== '0') {
    if (String(latest.error_code)==='1990043' && /会员/.test(latest.error_message??'')) return {kind:'membership-required',basis:'observed',reason:'服务端明确返回该功能需要高级会员；当前账号未通过该权限检查。'};
    if (String(latest.error_code)==='160002') return {kind:'already-completed',basis:'observed',reason:'服务端返回此前已签到；不能将重复请求当作本轮新增签到成功。'};
    if (latest.condition==='cleanup of first floor after own main thread deletion') return {kind:'deleted-thread-first-post-cleanup-rejected',basis:'observed',reason:'主帖删除后首楼仍可按编号读取，进一步清理返回230890；未验证彻底清除。'};
    if (/not a manager/i.test(latest.error_message ?? '')) return { kind: 'moderator-role-required', basis: 'observed', reason: '服务端明确返回当前查询账号不是吧务；本次账号无法完成该请求。' };
    return { kind: 'server-error-unresolved', basis: 'observed', reason: '当前请求返回业务码 ' + latest.error_code + '；参数、权限、场景或服务端原因尚未区分，不能据此认定登录失效。' };
  }
  if(latest?.incomplete_cleanup)return {kind:'partial-deletion-semantics',basis:'observed',reason:'主帖创建及详情删除已观察到，但删除后首楼按编号仍返回，不能宣称所有测试内容彻底清除。'};
  if(row.explicit_origin?.startsWith('http:')&&latest?.transport_upgraded_from_http)return {kind:'http-source-https-variant-tested',basis:'observed',reason:'APK字面量使用HTTP，本轮只测试了同主机HTTPS版本；原HTTP传输未验证。'};
  if (latest?.phase==='web-routes') {
    if(latest.status==='html-page-response')return {kind:'html-page-confirmed',basis:'observed',reason:'匿名GET已返回HTML页面；已验证路由格式，页面背后的业务API仍需单独测试。'};
    if(latest.status==='redirect-response')return {kind:'redirect-observed',basis:'observed',reason:'已收到重定向，未自动跟随或执行页面脚本；目标origin见观测。'};
    if(latest.status==='empty-response')return {kind:'empty-http-response',basis:'observed',reason:'HTTP返回空正文，缺少业务状态和对象，不能判为API通过。'};
  }
  if(latest?.phase==='media-probes' && latest.missing_fixture)return {kind:'media-fixture-missing-after-negative-control',basis:'observed',reason:'语音地址已做无参数负对照，但没有有效voice_md5，尚不能验证真实语音读取。'};
  if (isFunctional(best)) return { kind: 'verified-in-recorded-scope', basis: 'observed', reason: '已有对象或状态变化核对；仅覆盖报告记录的账号、样本和时间。' };
  if (['response-schema-validated', 'json-data-returned'].includes(best)) return { kind: 'functional-assertions-incomplete', basis: 'observed', reason: '已有业务返回或结构核对，尚未完成该能力的对象、边界或完整流程验收。' };
  if (best === 'accepted-empty-response') return { kind: 'nonempty-fixture-needed', basis: 'observed', reason: '当前样本返回成功但为空，缺少可核对的非空业务对象。' };
  if (row.category === 'nonproduction-or-other-origin') return { kind: 'origin-not-selected', basis: 'scope', reason: '来源并非已选择的贴吧生产域名，未向其发送本轮请求。' };
  if (row.category === 'web-route') return { kind: 'page-api-distinction-pending', basis: 'analysis', reason: '仅提取到网页路由，尚未确认是否为业务 API 及其请求。' };
  if (row.category === 'telemetry-or-state') return { kind: 'telemetry-environment-needed', basis: 'analysis', reason: '日志或遥测行为未恢复，缺少独立测试环境，未向生产遥测批量发送数据。' };
  if (row.category === 'media-resource') return { kind: 'media-request-fixture-needed', basis: 'analysis', reason: '尚未恢复该媒体地址所需的有效资源标识、请求格式及返回判据。' };
  if (/consume|alipay|buy|pay|order|delall|clear.*user|cancelaccount|closeaccount/i.test(row.path)) return { kind: 'isolated-account-or-order-fixture-needed', basis: 'analysis', reason: '涉及订单、支付或账号数据操作；没有相应测试订单或隔离账号环境，未用真实扣款或清空数据探测。' };
  if (/bawu|manager|banid|setgood|settop/i.test(row.path)) return { kind: 'moderator-fixture-or-protocol-needed', basis: 'analysis', reason: '需恢复具体吧务请求，并提供具备相应权限的测试吧和可回收对象；未执行该候选，非服务端拒绝的实测结论。' };
  if (/chat|friend|msg/i.test(row.path) && !latest) return { kind: 'im-session-or-target-needed', basis: 'analysis', reason: '单聊、群聊或消息请求尚未逐项恢复；两个网页登录态不等于已恢复 IM 会话及送达核对。' };
  if (row.category === 'stateful-or-auth-action') return { kind: 'operation-and-restore-plan-needed', basis: 'analysis', reason: '已获测试授权；该操作的请求、有效目标或恢复流程尚未建立，不能仅凭路径名执行。' };
  return { kind: 'request-or-response-construction-needed', basis: 'analysis', reason: '尚未恢复足够请求信息、有效参数样本或响应判据；尚无证据判定接口失效。' };
}

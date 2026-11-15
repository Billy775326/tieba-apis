export function classifyPcWebResult(row) {
  if(row.capture_attribution_valid===false)return 'local-capture-unconfirmed';
  if(row.conflicting_business_status===true)return 'business-status-conflict';
  if(row.http_status!==200)return row.http_status==null?'transport-incomplete':'http-error';
  if(typeof row.error_code!=='string'||!/^[-]?[0-9]+$/.test(row.error_code))return 'business-status-unconfirmed';
  if(row.error_code!=='0')return 'business-error';
  if(row.checks?.exact_thread_id===true||row.checks?.test_forum_name_matches===true||row.checks?.requested_forum_id_matches===true||row.checks?.own_user_id_matches===true||row.checks?.controlled_portrait_matches===true||row.checks?.portrait_without_query_matches===true||row.checks?.own_portrait_matches===true)return 'verified-read';
  const metadata=new Set(['time','ctime','server_time','logid','error_code','error_msg','prefetchObj']);
  if((row.data_keys??[]).every(k=>metadata.has(k)))return 'accepted-empty-response';
  return 'response-schema-validated';
}

export function pcReadFailed(row) {
  return ['business-error','http-error','transport-incomplete','business-status-unconfirmed','business-status-conflict'].includes(row.status)||Object.values(row.checks??{}).some(value=>value===false);
}

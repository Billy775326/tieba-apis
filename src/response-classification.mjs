const controlKeys = new Set(['error_code','error_msg','error','msg','code','server_time','time','logid','ctime','need_push']);
export function summarizeLegacyJson(value) {
  if(!value||typeof value!=='object'||Array.isArray(value))return {error_code:null,business_field_names:[],scalar_field_names:[],status:'unrecognized-business-status'};
  const raw=value.error_code;
  const error_code=(typeof raw==='number'&&Number.isSafeInteger(raw)||typeof raw==='string'&&/^-?\d+$/.test(raw))?String(raw):null;
  const business_field_names=Object.keys(value).filter(k=>!controlKeys.has(k));
  const scalar_field_names=business_field_names.filter(k=>typeof value[k]==='number'&&Number.isFinite(value[k])||typeof value[k]==='boolean'||typeof value[k]==='string'&&value[k].trim().length>0);
  const payload=scalar_field_names.length>0||business_field_names.some(k=>Array.isArray(value[k])?value[k].length>0:value[k]&&typeof value[k]==='object'?Object.keys(value[k]).length>0:false);
  return {error_code,business_field_names,scalar_field_names,status:error_code===null?'unrecognized-business-status':error_code!=='0'?'business-error':payload?'json-data-returned':'accepted-empty-response'};
}

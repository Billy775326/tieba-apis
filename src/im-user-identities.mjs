import crypto from 'node:crypto';
import {post} from './http/transport.mjs';
import {TiebaApiError} from './api/tieba-api.mjs';
const ENDPOINT='https://pim.baidu.com/rest/3.0/im/get_user_info';
function id(value){if(typeof value==='number'&&!Number.isSafeInteger(value)||!['string','number','bigint'].includes(typeof value)||!/^\d+$/.test(String(value)))throw Error('Use exact decimal user IDs');const n=BigInt(value);if(n<=0n||n>0x7fffffffffffffffn)throw Error('User ID outside positive int64');return String(n);}
/** Resolve explicitly supplied Baidu IDs to IM UKs. No network request occurs until called.
 * @param {{BDUSS:string,cuid:string,userIds:Array<string|number|bigint>,timeoutMs?:number,maxResponseBytes?:number,signal?:AbortSignal,transport?:Function}} options
 */
export async function getImUserIdentities({BDUSS,cuid,userIds,timeoutMs=12000,maxResponseBytes=1048576,signal,transport=post}={}) {
  if(typeof BDUSS!=='string'||!BDUSS||/[\r\n\0;]/.test(BDUSS))throw Error('Nonempty local BDUSS required');
  if(typeof cuid!=='string'||!cuid||cuid.length>256||/[\r\n\0]/.test(cuid))throw Error('Explicit logical IM device ID required');
  if(!Array.isArray(userIds)||userIds.length<1||userIds.length>20)throw Error('Provide 1..20 user IDs');
  const ids=userIds.map(id);if(new Set(ids).size!==ids.length)throw Error('Duplicate user IDs');
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000||!Number.isSafeInteger(maxResponseBytes)||maxResponseBytes<1||maxResponseBytes>8388608)throw Error('Invalid IM HTTP limits');
  if(signal!=null&&(typeof signal.aborted!=='boolean'||typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'))throw Error('AbortSignal required');
  if(typeof transport!=='function')throw Error('HTTP transport function required');
  const timestamp=Math.floor(Date.now()/1000),sign=crypto.createHash('md5').update(BDUSS+timestamp).digest('hex');
  const common={app_version:'22.13.1.1',sdk_version:11250036,cuid,device_type:2,appid:10773430,timestamp,sign};
  // Decimal IDs are validated before insertion as JSON numbers, preserving Java long precision.
  const body=Buffer.from(JSON.stringify(common).slice(0,-1)+',"bd_uids":['+ids.join(',')+']}');
  let raw,response;const meta={endpoint:'/rest/3.0/im/get_user_info',origin:'https://pim.baidu.com',command:null};
  try{response=await transport(ENDPOINT,{body,headers:{'Content-Type':'application/json',Cookie:'BDUSS='+BDUSS},authenticated:true,credentialPolicy:'pim-identity-cookie',timeoutMs,maxBytes:maxResponseBytes,signal,profile:'source-recovered-im-identity-read',onBody:b=>{raw=b;}});}catch{throw new TiebaApiError('transport','TRANSPORT_ERROR',meta);}
  Object.assign(meta,{http_status:response.http_status??null,response_sha256:response.response_sha256??null,response_bytes:response.response_bytes??null});
  if(response.classification!=='response-received-unverified'||!Buffer.isBuffer(raw))throw new TiebaApiError('transport',response.error??'INCOMPLETE_RESPONSE',meta);
  if(response.http_status!==200)throw new TiebaApiError('http',String(response.http_status),meta);
  let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw),(key,value,context)=>['bd_uid','uk'].includes(key)&&typeof value==='number'?context.source:value);}catch{throw new TiebaApiError('protocol','INVALID_JSON_RESPONSE',meta);}
  const code=data?.error_code;if(!(typeof code==='string'&&/^-?\d+$/.test(code)||typeof code==='number'&&Number.isSafeInteger(code)))throw new TiebaApiError('protocol','INVALID_ERROR_ENVELOPE',meta);
  if(String(code)!=='0')throw new TiebaApiError('business',String(code),meta);
  let users;try{if(!Array.isArray(data.user_list))throw Error('Missing user list');users=data.user_list.map(u=>({bd_uid:id(u.bd_uid),uk:id(u.uk),...(typeof u.display_name==='string'?{display_name:u.display_name}:{}),...(typeof u.avatar==='string'?{avatar:u.avatar}:{})}));}catch{throw new TiebaApiError('protocol','INVALID_IDENTITY_RESPONSE',meta);}
  if(users.length!==ids.length||new Set(users.map(u=>u.bd_uid)).size!==ids.length||ids.some(uid=>!users.some(u=>u.bd_uid===uid)))throw new TiebaApiError('object-mismatch','REQUESTED_OBJECT_NOT_RETURNED',meta);
  return {user_list:users,meta:{...meta,error_code:'0'}};
}

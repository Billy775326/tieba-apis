// Runs inside the authenticated browser. No frontend request wrapper or UI action.
export function pcWebMd5(text) {
  const bytes = new TextEncoder().encode(text), size = Math.ceil((bytes.length + 9) / 64) * 64;
  const buffer = new Uint8Array(size); buffer.set(bytes); buffer[bytes.length] = 128;
  const view = new DataView(buffer.buffer), bits = BigInt(bytes.length) * 8n;
  view.setUint32(size - 8, Number(bits & 0xffffffffn), true);
  view.setUint32(size - 4, Number(bits >> 32n), true);
  const shifts = [7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21];
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let offset = 0; offset < size; offset += 64) {
    let a = a0, b = b0, c = c0, d = d0;
    for (let i = 0; i < 64; i++) {
      const round = i >> 4;
      const f = round === 0 ? (b & c) | (~b & d) : round === 1 ? (d & b) | (~d & c) : round === 2 ? b ^ c ^ d : c ^ (b | ~d);
      const g = round === 0 ? i : round === 1 ? (5 * i + 1) % 16 : round === 2 ? (3 * i + 5) % 16 : (7 * i) % 16;
      const n = (a + f + Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) + view.getUint32(offset + g * 4, true)) | 0;
      const shift = shifts[round * 4 + i % 4], next = (b + ((n << shift) | (n >>> (32 - shift)))) | 0;
      a = d; d = c; c = b; b = next;
    }
    a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0;
  }
  return [a0,b0,c0,d0].flatMap(n => [0,8,16,24].map(s => ((n >>> s) & 255).toString(16).padStart(2,'0'))).join('');
}

// Serializable bootstrap. All credentials and response values stay in this closure.
// The CLI supplies a fixed read plan; this internal transport is not a write CLI.
export async function installPcDirectSession(sessionKey, md5) {
  if (location.origin !== 'https://tieba.baidu.com' || !/^__pcDirect[0-9a-f]+$/.test(sessionKey)) throw Error('Invalid PC session context');
  if (Object.prototype.hasOwnProperty.call(window, sessionKey)) throw Error('PC session key already exists');
  const state = {portrait:null,tbs:null,loggedIn:false,sequence:0,lastData:null,lastRaw:null};
  window[sessionKey] = state;
  state.request = async function({path,method='GET',data={},formData=false,headers={},expectedThread,expectedForum,ownPortrait=false,auth=false}) {
    state.lastRaw=null;state.lastData=null;
    if (!/^\/(?:c|mo|photo)\/[A-Za-z0-9_/-]+$/.test(path) && !['/f/user/json_userinfo','/dc/common/tbs'].includes(path)) throw Error('Unreviewed PC API path');
    if (path.includes('..') || !['GET','POST'].includes(method) || !data || typeof data !== 'object' || Array.isArray(data)) throw Error('Invalid PC request');
    if(!auth&&!state.loggedIn)throw Error('Authenticated PC HTTP session required');
    const started = new Date().toISOString(), params = {...data}, url = new URL(path,location.origin);
    // Matches the pinned PC httpBySign defaults and field-order signing contract.
    if (!auth) {
      params.subapp_type = 'pc'; params._client_type ??= 20;
      if (method !== 'GET') params.tbs = state.tbs;
    }
    params._ = String(Date.now()) + String(++state.sequence).padStart(3,'0');
    if (!auth) params.sign = md5(Object.keys(params).filter(k => !['sign','sig'].includes(k) && params[k] !== undefined).sort().map(k => k + '=' + params[k]).join('') + '36770b1f34c9bbf2e7d1a99d2b82fa9e');
    const fields = Object.entries(params).filter(([,v]) => v !== undefined);
    const init = {method,credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Accept:'application/json','X-Requested-With':'XMLHttpRequest',...headers}};
    if (method === 'GET') for (const [k,v] of fields) url.searchParams.set(k,String(v));
    else if (formData) {init.body = new FormData();for (const [k,v] of fields) init.body.append(k,v);}
    else {init.headers['Content-Type']='application/x-www-form-urlencoded;charset=UTF-8';init.body=new URLSearchParams(fields.map(([k,v])=>[k,String(v)]));}
    const response = await fetch(url.href,init), reader = response.body.getReader(), chunks=[];
    let size=0;
    try {while (true) {const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>1048576){await reader.cancel();throw Error('PC response exceeded size limit');}chunks.push(item.value);}} finally {reader.releaseLock();}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    const text=new TextDecoder().decode(bytes);let raw=null;try {raw=JSON.parse(text);} catch {}
    const d=raw&&typeof raw==='object'?(raw.data&&typeof raw.data==='object'?raw.data:raw):{};
    state.lastRaw=raw;state.lastData=d;
    const codes=[raw?.no,raw?.errno,raw?.error?.errno,raw?.error_code].filter(v=>typeof v==='number'&&Number.isSafeInteger(v)||typeof v==='string'&&/^-?[0-9]+$/.test(v));
    const via=response.headers.get('tieba-response-via'),age=response.headers.get('age'),ageSeconds=age!==null&&/^\d+$/.test(age)?Number(age):null;
    const digest=await crypto.subtle.digest('SHA-256',bytes),checks={};
    if(expectedThread!==undefined)checks.exact_thread_id=String(d.thread?.id)===String(expectedThread);
    if(expectedForum!==undefined)checks.test_forum_name_matches=d.forum?.name===expectedForum;
    if(ownPortrait)checks.own_portrait_matches=d.user_info?.portrait?.split('?')[0]===state.portrait?.split('?')[0];
    return {path,method,http_status:response.status,error_code:codes.length?String(codes[0]):null,conflicting_business_status:new Set(codes.map(String)).size>1,response_non_json:raw===null,data_keys:Object.keys(d),array_lengths:Object.fromEntries(Object.entries(d).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length])),response_sha256:[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join(''),response_bytes:size,digest_basis:'Browser fetch response bytes',request_started_at_utc:started,response_received_at_utc:new Date().toISOString(),transport:'direct-browser-fetch',frontend_http_wrapper_used:false,ui_action_performed:false,cache_mode:'no-store',cache_buster_added:true,prefetch_response:via==='prefetch',response_age_seconds:ageSeconds,freshness_confirmed:via!=='prefetch'&&!(ageSeconds>0),checks};
  };
  const identity=await state.request({path:'/f/user/json_userinfo',auth:true});
  const user=state.lastData;state.portrait=user.user_portrait;
  const identityLogged=user.is_login===true||String(user.is_login)==='1';
  const csrf=await state.request({path:'/dc/common/tbs',auth:true});
  const token=state.lastData;state.tbs=typeof token.tbs==='string'?token.tbs:null;
  const fresh=identity.freshness_confirmed&&csrf.freshness_confirmed;
  const logged=identityLogged&&(token.is_login===true||String(token.is_login)==='1')&&!!state.tbs;
  state.loggedIn=logged&&fresh;
  state.lastData=null;state.lastRaw=null;
  return {logged_in:logged,csrf_available:!!state.tbs,freshness_confirmed:fresh,identity_http_reads:2,auth_responses:[identity,csrf]};
}

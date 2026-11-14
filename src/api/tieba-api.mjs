import {post} from '../http/transport.mjs';
import {fields,bytesField as b,intField as i} from '../protobuf.mjs';
import {parseThreadTarget} from '../thread-target.mjs';
import {TiebaAuth} from '../auth.mjs';
import {APP,validateLimits} from '../config.mjs';
import {READ_METHODS} from './read-contracts.mjs';
import {encodeReadRequest,decodeSelected,one} from './protobuf-read.mjs';

export class TiebaApiError extends Error {
  constructor(kind,code,meta={}) {
    super('Tieba request failed: '+kind+' ('+String(code)+')');
    this.name='TiebaApiError';this.kind=kind;this.code=code;this.meta=meta;
  }
}
function identifier(value,name) {
  if(typeof value==='number'&&!Number.isSafeInteger(value))throw Error(name+' must preserve all integer digits; use a decimal string');
  if(!['string','number','bigint'].includes(typeof value)||!/^\d+$/.test(String(value)))throw Error(name+' must be a positive decimal identifier');
  const n=BigInt(value);
  if(n<1n||n>0x7fffffffffffffffn)throw Error(name+' outside positive int64 range');
  return n.toString();
}
function threadIdentifier(value) {
  if(!['string','number','bigint'].includes(typeof value))throw Error('Thread target must be an official URL or exact identifier');
  if(typeof value==='number'&&!Number.isSafeInteger(value))throw Error('Use a decimal string for the thread identifier');
  return parseThreadTarget(value);
}
function text(value,name) {
  if(typeof value!=='string'||!value.trim()||value.length>256)throw Error(name+' must contain 1..256 characters');
  return value.trim();
}
function paging({pn=1,rn=20}={},allowRn=true) {
  if(!Number.isSafeInteger(pn)||pn<1||pn>2147483647)throw Error('pn must be a positive int32');
  if(allowRn&&(!Number.isSafeInteger(rn)||rn<1||rn>100))throw Error('rn must be an integer in 1..100');
  return {pn,rn};
}
function assertObject(condition,meta) {if(!condition)throw new TiebaApiError('object-mismatch','REQUESTED_OBJECT_NOT_RETURNED',meta);}

/** A reusable client for the five verified public read families; no request on construction. */
export class TiebaApi {
  #auth; #transport; #limits;
  /** @param {{auth?:TiebaAuth|null,timeoutMs?:number,maxResponseBytes?:number,transport?:Function}} options */
  constructor({auth=null,transport=post,...limits}={}) {
    if(auth!==null&&!(auth instanceof TiebaAuth))throw Error('auth must be a TiebaAuth instance');
    if(typeof transport!=='function')throw Error('HTTP transport function required');
    this.#auth=auth;this.#transport=transport;this.#limits=validateLimits(limits);
  }
  async #call(method,parts,options={}) {
    if(!options||typeof options!=='object'||Array.isArray(options))throw Error('Read options object required');
    const {signal}=options;
    if(signal!=null&&(typeof signal.aborted!=='boolean'||typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'))throw Error('AbortSignal required');
    const spec=READ_METHODS[method];let raw;
    const meta={endpoint:spec.path,command:spec.command};
    let response;
    try {response=await this.#transport(APP.origin+spec.path+'?cmd='+spec.command+'&format=protobuf',{
      ...encodeReadRequest(spec,parts,this.#auth),timeoutMs:this.#limits.timeoutMs,maxBytes:this.#limits.maxResponseBytes,
      authenticated:this.#auth!==null,profile:'api-client-protobuf-read',signal,onBody:body=>{raw=body;},
    });}catch{throw new TiebaApiError('transport','TRANSPORT_ERROR',meta);}
    Object.assign(meta,{http_status:response.http_status??null,response_sha256:response.response_sha256??null,response_bytes:response.response_bytes??null});
    if(response.classification!=='response-received-unverified'||!Buffer.isBuffer(raw))throw new TiebaApiError('transport',response.error??'INCOMPLETE_RESPONSE',meta);
    if(response.http_status!==200)throw new TiebaApiError('http',String(response.http_status),meta);
    let root,code;
    try {
      root=fields(raw);const error=one(root,1,{required:true});if(error.wire!==2)throw Error('Error envelope wire mismatch');
      const codeField=one(fields(error.value),1,{required:true});if(codeField.wire!==0)throw Error('Status wire mismatch');code=codeField.value;
    }catch{throw new TiebaApiError('protocol','INVALID_ERROR_ENVELOPE',meta);}
    if(code!=='0')throw new TiebaApiError('business',code,meta);
    let data;
    try {const payload=one(root,2,{required:true});if(payload.wire!==2)throw Error('Data envelope wire mismatch');data=decodeSelected(payload.value,spec.schema);}
    catch{throw new TiebaApiError('protocol','INVALID_DATA_ENVELOPE',meta);}
    return {...data,meta:{...meta,error_code:code}};
  }
  /** @param {string} name @param {{pn?:number,rn?:number,signal?:AbortSignal}} options */
  async getForumThreads(name,options={}) {
    name=text(name,'forum name');const {pn,rn}=paging(options);
    const data=await this.#call('getForumThreads',[b(1,name),i(2,rn),i(15,pn)],options);
    assertObject(data.forum?.name?.toLowerCase()===name.toLowerCase()&&data.page?.current_page===pn,data.meta);return data;
  }
  /** @param {string|bigint|number} target Official /p/<id> URL or exact thread identifier.
   * @param {{pn?:number,rn?:number,signal?:AbortSignal}} options */
  async getThread(target,options={}) {
    const tid=threadIdentifier(target),{pn,rn}=paging(options);
    const data=await this.#call('getThread',[i(4,tid),i(18,pn),i(13,rn)],options);
    assertObject(data.thread?.id===tid&&(!data.page||data.page.current_page===pn),data.meta);return data;
  }
  /** @param {string|bigint|number} target @param {string|bigint|number} postId @param {{pn?:number,signal?:AbortSignal}} options */
  async getPostReplies(target,postId,options={}) {
    const tid=threadIdentifier(target),pid=identifier(postId,'postId'),{pn}=paging(options,false);
    const data=await this.#call('getPostReplies',[i(1,tid),i(2,pid),i(4,pn)],options);
    const emptyFirstPage=pn===1&&data.subpost_list.length===0&&data.page?.current_page===0&&data.page?.total_page===0;
    assertObject(data.post?.id===pid&&(!data.page||data.page.current_page===pn||emptyFirstPage),data.meta);return data;
  }
  /** @param {string|bigint|number} userId @param {{pn?:number,rn?:number,signal?:AbortSignal}} options */
  async getUserProfile(userId,options={}) {
    const uid=identifier(userId,'userId'),{pn,rn}=paging({rn:1,...options});
    const data=await this.#call('getUserProfile',[i(1,uid),i(6,pn),i(7,rn)],options);
    assertObject(data.user?.id===uid,data.meta);return data;
  }
  /** Search posting-target forums, not a site-wide thread search. */
  async searchForums(word,options={}) {return this.#call('searchForums',[b(2,text(word,'search word'))],options);}
}

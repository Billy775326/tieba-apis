import crypto from 'node:crypto';
export const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const URL_PATTERN=/(?:https?|wss?):\/\/[^\s"'<>`\\{}\x00-\x1f]+/g;
const RELATIVE=/^\/?[a-zA-Z][a-zA-Z0-9_.%-]*(?:\/[a-zA-Z0-9_.%+~@-]+)+(?:\?[a-zA-Z0-9_?=&.%+~@:/-]*)?$/;
export function classifyHost(host) {
  if(!host)return 'unresolved-origin';
  if(/^(?:localhost|127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host)||/mock|\.test$|\.invalid$/.test(host))return 'nonproduction-or-example';
  if(['tieba.baidu.com','tiebac.baidu.com','c.tieba.baidu.com'].includes(host))return 'tieba-http';
  if(['pim.baidu.com','common.lcs.baidu.com'].includes(host))return 'tieba-im';
  if(/(?:^|\.)(?:baidu\.com|bdstatic\.com|baidubce\.com|bcebos\.com)$/.test(host))return 'baidu-other';
  if(/[%$]/.test(host))return 'template-origin';
  return 'other-origin';
}
export function normalizeSurface(value,{relative=false}={}) {
  if(typeof value!=='string'||value.length>8192||value.includes('\ufffd'))return null;
  let url;try{url=new URL(relative?value.replace(/^\/?/,'https://unresolved.invalid/'):value);}catch{return null;}
  if(!relative&&!['http:','https:','ws:','wss:'].includes(url.protocol))return null;
  const originalPath=url.pathname;
  const path=originalPath.split('/').map(s=>/^\d{6,}$/.test(s)?':numeric-id':/^(?:[a-zA-Z0-9_-]{48,}|[a-fA-F0-9]{24,})(?:\.[a-zA-Z0-9_-]+)?$/.test(s)?':opaque-segment':s).join('/');
  const query_keys=[...new Set([...url.searchParams.keys()].filter(k=>/^[a-zA-Z_][a-zA-Z0-9_.-]{0,39}$/.test(k)&&!/[a-fA-F0-9]{24,}/.test(k)))].sort();
  const host=relative?null:url.hostname;
  const family=/^\/(?:c\/[a-z]\/|mo\/[a-z]\/|rest\/|api\/|v\d+\/)/i.test(path)?'api-shaped':/\.(?:png|jpe?g|gif|webp|svg|js|css|woff2?|ttf|mp[34]|zip|so|apk)$/i.test(path)?'resource-shaped':/\.html?$/.test(path)?'web-shaped':'unclassified';
  return {scheme:relative?null:url.protocol.slice(0,-1),host,port:relative?null:url.port||null,path,query_keys,query_values_omitted:!!url.search,fragment_omitted:!!url.hash,userinfo_omitted:!!(url.username||url.password),path_redacted:path!==originalPath,scope:classifyHost(host),family};
}
/** Presence only: never resolves a host or makes a request. */
export function extractNetworkLiterals(text) {
  const result=[],decoded=text.replaceAll('\\/','/');
  for(const match of decoded.matchAll(URL_PATTERN)) {
    const literal=match[0].replace(/[),;\].]+$/,'');const normalized=normalizeSurface(literal);
    if(normalized)result.push({literal,offset:match.index,kind:'absolute-url',offset_basis:decoded===text?'string-code-units':'decoded-slashes-code-units',...normalized});
  }
  if(!result.length&&text.length<=2048&&RELATIVE.test(text)&&!/[;()<>\[\]\s]/.test(text)) {
    const normalized=normalizeSurface(text,{relative:true});if(normalized)result.push({literal:text,offset:0,kind:'relative-path',offset_basis:'string-code-units',...normalized});
  }
  return result;
}
export function* dexStrings(bytes,name) {
  if(bytes.length<112||!/^dex\n0(?:35|37|38|39|40)\0$/.test(bytes.subarray(0,8).toString('ascii')))throw Error('Unsupported or truncated DEX: '+name);
  if(bytes.readUInt32LE(32)!==bytes.length||bytes.readUInt32LE(40)!==0x12345678)throw Error('Invalid DEX header: '+name);
  const count=bytes.readUInt32LE(56),table=bytes.readUInt32LE(60);
  if(table<112||table+count*4>bytes.length)throw Error('Invalid DEX string table: '+name);
  for(let index=0;index<count;index++) {
    const dataOffset=bytes.readUInt32LE(table+index*4);let p=dataOffset,n=0,byte;
    do{if(p>=bytes.length||n++>=5)throw Error('Invalid DEX string length');byte=bytes[p++];}while(byte&128);
    const end=bytes.indexOf(0,p);if(end<0)throw Error('Unterminated DEX string');
    yield {value:bytes.toString('utf8',p,end),string_index:index,string_data_offset:dataOffset};
  }
}

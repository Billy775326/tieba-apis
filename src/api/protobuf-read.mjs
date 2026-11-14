import {bytesField,intField,fields} from '../protobuf.mjs';
import {APP} from '../config.mjs';

export function encodeReadRequest(contract,parts,auth) {
  const common=Buffer.concat([intField(1,APP.clientType),bytesField(2,APP.version),intField(8,Date.now()),bytesField(24,APP.protocolVersion),...(auth?.commonFields()??[])]);
  const packet=bytesField(1,Buffer.concat([...parts,bytesField(contract.commonTag,common)]));
  const boundary='----TiebaApiClientRead';
  return {body:Buffer.concat([Buffer.from('--'+boundary+'\r\nContent-Disposition: form-data; name="data"; filename="data"\r\nContent-Type: application/octet-stream\r\n\r\n'),packet,Buffer.from('\r\n--'+boundary+'--\r\n')]),headers:{'Content-Type':'multipart/form-data; boundary='+boundary}};
}
export function one(list,tag,{required=false}={}) {
  const found=list.filter(x=>x.tag===tag);
  if(found.length>1||required&&found.length!==1)throw Error('Missing or ambiguous protobuf field '+tag);
  return found[0];
}
export function decodeSelected(raw,schema) {
  const parsed=fields(raw),result={};
  for(const [name,[tag,type,repeated]]of Object.entries(schema)) {
    const selected=parsed.filter(f=>f.tag===tag);
    if(!repeated&&selected.length>1)throw Error('Ambiguous response field '+name);
    const decode=f=>{
      const binary=type==='string'||typeof type==='object';
      if(f.wire!==(binary?2:0))throw Error('Response wire mismatch at '+name);
      if(typeof type==='object')return decodeSelected(f.value,type);
      if(type==='string')return new TextDecoder('utf-8',{fatal:true}).decode(f.value);
      if(type==='int64')return BigInt.asIntN(64,BigInt(f.value)).toString();
      if(type==='uint64')return f.value;
      if(type==='int32')return Number(BigInt.asIntN(32,BigInt(f.value)));
      if(BigInt(f.value)>0xffffffffn)throw Error('Response uint32 overflow at '+name);
      return Number(f.value);
    };
    if(repeated)result[name]=selected.map(decode);
    else if(selected.length)result[name]=decode(selected[0]);
  }
  return result;
}

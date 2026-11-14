import fs from 'node:fs';import{digest}from'../src/network-surface.mjs';
const [modelFile,evidenceFile,messagesOutput,requestsOutput]=process.argv.slice(2);
if(!requestsOutput)throw Error('Usage: node scripts/build-wire-inventory.mjs ALL_MODELS ENDPOINT_EVIDENCE MESSAGES_OUTPUT REQUESTS_OUTPUT');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'')),all=read(modelFile),base=read(evidenceFile);
if(all.artifact.sha256!==base.artifact.sha256)throw Error('Model artifact mismatch');
const messages=all.models.flatMap(model=>{
 const fields=model.fields.flatMap(f=>{const a=f.annotations.find(x=>x.type==='Lcom/squareup/wire/ProtoField;')?.elements;if(!a)return[];const signature=f.annotations.find(x=>x.type==='Ldalvik/annotation/Signature;')?.elements.value;
 return [{name:f.name,tag:a.tag.raw_unsigned,datatype:a.type?.name??null,descriptor:f.type,repeated:a.label?.name==='REPEATED',...(signature?{signature}:{}),field_index:f.field_index}];});
 if(!fields.length)return[];if(fields.some(f=>!Number.isSafeInteger(f.tag)||f.tag<1)||new Set(fields.map(f=>f.tag)).size!==fields.length)throw Error('Invalid model tags');
 return [{descriptor:model.descriptor,dex:model.dex,class_def_index:model.class_def_index,fields:fields.sort((a,b)=>a.tag-b.tag)}];
}).sort((a,b)=>a.descriptor.localeCompare(b.descriptor));
if(new Set(messages.map(x=>x.descriptor)).size!==messages.length)throw Error('Duplicate message descriptors require explicit review');
const byName=new Map(messages.map(m=>[m.descriptor,m]));
const requests=messages.filter(m=>/ReqIdl;$/.test(m.descriptor)).map(m=>{
 const responseName=m.descriptor.replace(/ReqIdl;$/,'ResIdl;');const reqData=m.fields.find(x=>x.name==='data'),response=byName.get(responseName);return{request_descriptor:m.descriptor,request_wrapper:m.fields,request_data_descriptor:reqData?.descriptor??null,request_fields:byName.get(reqData?.descriptor)?.fields??[],response_descriptor:response?.descriptor??null,response_wrapper:response?.fields??[],mapping_status:'schema-name-pair-only',endpoint:null,command:null};
});
const common={schema_version:1,artifact:base.artifact,source_model_sha256:digest(fs.readFileSync(modelFile)),method:'All ProtoField annotations in the pinned DEX model extraction; fields only, no static credential defaults or target execution',limitations:['A schema declaration does not establish an active endpoint or command.','Request/response pairs are matched by ReqIdl/ResIdl naming, not runtime dispatch.','Non-Wire JSON, SDK RPC and native schemas are not described by these annotations.']};
fs.writeFileSync(messagesOutput,JSON.stringify({...common,summary:{messages:messages.length,fields:messages.reduce((n,m)=>n+m.fields.length,0)},messages},null,2)+'\n');
fs.writeFileSync(requestsOutput,JSON.stringify({...common,summary:{requests:requests.length,paired_responses:requests.filter(x=>x.response_descriptor).length},requests},null,2)+'\n');console.log(JSON.stringify({messages:messages.length,fields:messages.reduce((n,m)=>n+m.fields.length,0),request_wrappers:requests.length}));

import fs from 'node:fs';
import crypto from 'node:crypto';
import {probe} from './verify-read-api.mjs';
import {summarizeLegacyJson} from '../src/response-classification.mjs';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const args=process.argv.slice(2);
if(!args.includes('--live'))throw Error('Explicit --live required; sends anonymous empty POST diagnostics only.');
const limitIndex=args.indexOf('--limit');
const limit=limitIndex<0?Infinity:Number(args[limitIndex+1]);
if(limitIndex>=0&&(!Number.isSafeInteger(limit)||limit<1||!/^[1-9]\d*$/.test(args[limitIndex+1]??'')))throw Error('--limit requires a positive integer');
const allowed=new Set(['--live','--limit']);
for(let n=0;n<args.length;n++){if(!allowed.has(args[n]))throw Error('Unsupported option');if(args[n]==='--limit')n++;}
const base=read('evidence/current-api-coverage.json');
const frozen=read('evidence/supplemental-validation.json');
if(base.artifact.sha256!==frozen.artifact.sha256)throw Error('Artifact mismatch');
const cases=frozen.phases.find(p=>p.name==='anonymous-boundaries').results.filter(o=>
 o.candidate_ids.some(id=>{const row=base.rows.find(r=>r.id===id);return row&&row.path===o.path&&row.category!=='nonproduction-or-other-origin'&&row.execution_scope!=='moderation-excluded-by-user';})
).slice(0,limit);
for(const o of cases)if(!/^\/c\/[A-Za-z0-9/_-]+$/.test(o.path)||o.command!=null&&!/^\d+$/.test(String(o.command)))throw Error('Invalid frozen production route');
fs.mkdirSync('.local',{recursive:true});
const run=crypto.randomUUID();
const output='.local/anonymous-boundaries-'+run+'-report.json';
const report={schema_version:1,artifact:base.artifact,started_at_utc:new Date().toISOString(),scope:'Anonymous empty POST diagnostics; no credentials, target IDs or body parameters. Not functional validation.',results:[]};
const save=()=>fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
for(const sample of cases){
 let raw;
 const url='https://tiebac.baidu.com'+sample.path+(sample.command==null?'':'?cmd='+sample.command+'&format=protobuf');
 const r=await probe(url,{profile:'anonymous-empty-post-negative-control',onBody:b=>raw=b});
 const result={path:sample.path,command:sample.command??null,candidate_ids:sample.candidate_ids,observed_at_utc:new Date().toISOString(),authenticated:false,negative_control:true,input_fields:[],http_status:r.http_status??null,response_sha256:r.response_sha256??null,response_bytes:r.response_bytes??null,status:r.http_response_received?'negative-control-response':'transport-incomplete',error_code:null};
 if(raw){fs.writeFileSync('.local/anonymous-boundaries-'+run+'-'+report.results.length+'.bin',raw);try{const d=JSON.parse(raw.toString('utf8'));result.error_code=summarizeLegacyJson(d).error_code;result.response_format='json';}catch{result.response_format='non-json-response';}}
 report.results.push(result);save();
 console.log(JSON.stringify({done:report.results.length,total:cases.length,path:result.path,http_status:result.http_status,error_code:result.error_code}));
}
report.finished_at_utc=new Date().toISOString();save();
console.log(JSON.stringify({report:output,requests:report.results.length,scope:'anonymous diagnostics only'}));

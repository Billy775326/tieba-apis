import fs from 'node:fs';
import https from 'node:https';
import crypto from 'node:crypto';
if (!process.argv.includes('--live')) throw Error('Explicit --live required');
const coverage=JSON.parse(fs.readFileSync('evidence/api-coverage.json','utf8'));
const cases=new Map();
for(const row of coverage.rows.filter(r=>r.category==='web-route')) {
  const url=new URL(row.source_value,'https://tieba.baidu.com/');
  if(url.protocol==='http:'&&url.hostname==='tieba.baidu.com')url.protocol='https:';
  if(url.protocol!=='https:'||!['tieba.baidu.com','tiebac.baidu.com'].includes(url.hostname)||url.username||url.password)throw Error('Unexpected route origin');
  url.hash='';
  if(!cases.has(url.href))cases.set(url.href,{url:url.href,candidate_ids:[]});
  cases.get(url.href).candidate_ids.push(row.id);
}
fs.mkdirSync('.local',{recursive:true});
const report={schema_version:1,artifact:coverage.artifact,scope:'Anonymous GET route classification only; no Cookie, no page JavaScript, no business-success inference from HTTP status',started_at_utc:new Date().toISOString(),results:[]};
function get(item,index){return new Promise(resolve=>{
  let done=false,req;const out={candidate_ids:item.candidate_ids,path:new URL(item.url).pathname,observed_at_utc:new Date().toISOString(),status:'transport-error'};
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);resolve(out)};
  const timer=setTimeout(()=>{out.transport_error='overall-timeout';finish();req?.destroy()},8000);
  req=https.get(item.url,{headers:{'User-Agent':'tieba-apis-route-validation/0.1','Accept-Encoding':'identity'}},res=>{
    out.http_status=res.statusCode;out.content_type=res.headers['content-type']??null;
    if(res.headers.location){try{const u=new URL(res.headers.location,item.url);out.redirect_origin=u.origin;out.redirect_path=u.pathname;out.redirect_protocol=u.protocol}catch{out.redirect_invalid=true}}
    const chunks=[];let bytes=0;const hash=crypto.createHash('sha256');
    res.on('data',b=>{bytes+=b.length;if(bytes>1048576){out.status='response-size-limit';finish();res.destroy();req.destroy();return}hash.update(b);chunks.push(b)});
    res.on('error',e=>{out.transport_error=e.code??e.name;finish()});
    res.on('end',()=>{if(done)return;const body=Buffer.concat(chunks);out.response_bytes=bytes;out.response_sha256=hash.digest('hex');fs.writeFileSync('.local/web-route-'+index+'.bin',body);
      const text=body.toString('utf8').trim();let json;try{json=JSON.parse(text)}catch{}
      if(res.statusCode>=300&&res.statusCode<400)out.status='redirect-response';
      else if(res.statusCode>=400)out.status='http-error';
      else if(json&&typeof json==='object'){out.status='json-response-unverified';out.top_level_fields=Object.keys(json).slice(0,40);for(const key of ['no','error_code','errno'])if(typeof json[key]==='number'||typeof json[key]==='string'&&/^-?\d+$/.test(json[key])){out.business_status_field=key;out.business_code=String(json[key]);break}}
      else if(/<html|<!doctype html/i.test(text)){out.status='html-page-response';out.script_count=(text.match(/<script\b/gi)??[]).length;out.has_form=/<form\b/i.test(text)}
      else out.status=bytes?'other-response':'empty-response';finish();
    });
  });req.on('error',e=>{out.transport_error=e.code??e.name;finish()});
})}
let index=0;for(const item of cases.values()){const out=await get(item,index++);report.results.push(out);fs.writeFileSync('.local/web-route-validation.json',JSON.stringify(report,null,2));if(index%10===0)console.log(JSON.stringify({completed:index,total:cases.size,latest_status:out.status}));await new Promise(r=>setTimeout(r,300));}
report.finished_at_utc=new Date().toISOString();report.summary=Object.fromEntries([...new Set(report.results.map(x=>x.status))].map(s=>[s,report.results.filter(x=>x.status===s).length]));fs.writeFileSync('.local/web-route-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({requests:index,candidates:report.results.flatMap(x=>x.candidate_ids).length,statuses:report.summary}));

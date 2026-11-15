import{installPcDirectSession,pcWebMd5}from'../src/pc-web-direct.mjs';
import fs from'node:fs';import path from'node:path';import crypto from'node:crypto';import{pathToFileURL}from'node:url';import{PcWebRpc}from'../src/pc-web-browser.mjs';import{classifyPcWebResult,pcReadFailed}from'../src/pc-web-validation.mjs';import{parseThreadTarget}from'../src/thread-target.mjs';
export function parsePcReadArgs(args){const out={live:false};for(let i=0;i<args.length;i++){const a=args[i];if(a==='--refresh-session')out.refreshSession=true;else if(a==='--help')out.help=true;else if(a==='--live')out.live=true;else if(['--port','--thread','--forum','--output'].includes(a)){if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing option value');out[a.slice(2)]=args[++i];}else throw Error('Unknown option');}if(out.port!==undefined){if(!/^\d+$/.test(out.port)||Number(out.port)<1||Number(out.port)>65535)throw Error('Invalid local debugging port');out.port=Number(out.port);}if(out.thread!==undefined)out.thread=parseThreadTarget(out.thread);if(out.live&&!out.help&&out.thread===undefined)throw Error('Explicit --thread required for live verification');if(out.forum!==undefined&&(!out.forum.trim()||out.forum.length>256))throw Error('Invalid forum name');return out;}
async function main() {
  const options=parsePcReadArgs(process.argv.slice(2));
  if(options.help||!options.live){console.log('Direct PC HTTP read verification. Usage: node scripts/verify-pc-web.mjs --live --port PORT --thread ID_OR_URL [--forum NAME] [--refresh-session] [--output NEW_FILE]\nUses browser fetch with no-store, fresh request parameters and in-browser PC signing. --refresh-session reloads the dedicated PC tab with ignoreCache before requests. No UI actions or writes.');return;}
  if(!options.port)throw Error('Explicit --port required');
  const output=path.resolve(options.output??path.join('.local','pc-web-read-'+crypto.randomUUID()+'.json'));
  fs.mkdirSync(path.dirname(output),{recursive:true});const fd=fs.openSync(output,'wx');
  const key='__pcDirect'+crypto.randomBytes(8).toString('hex');let client;
  const report={schema_version:2,scope:'Direct PC HTTP reads using browser session cookies',started_at_utc:new Date().toISOString(),cookie_exported:false,request_headers_recorded:false,writes_executed:false,ui_actions_performed:false,frontend_http_wrapper_used:false,session_refresh_requested:!!options.refreshSession,session_refresh_completed:false,results:[]};
  const save=()=>{fs.ftruncateSync(fd,0);fs.writeSync(fd,JSON.stringify(report,null,2)+'\n',0,'utf8');};
  try {
    client=await PcWebRpc.connect(options.port);
    if(options.refreshSession){
      const previous=await client.evaluate('performance.timeOrigin');await client.send('Page.reload',{ignoreCache:true});
      const deadline=Date.now()+12000;let ready=false;
      while(Date.now()<deadline){try{ready=await client.evaluate("performance.timeOrigin!=="+JSON.stringify(previous)+"&&location.origin==='https://tieba.baidu.com'&&['interactive','complete'].includes(document.readyState)");}catch{}if(ready)break;await new Promise(resolve=>setTimeout(resolve,200));}
      if(!ready)throw Error('PC session reload did not complete');report.session_refresh_completed=true;
    }
    report.session=await client.evaluate('('+installPcDirectSession.toString()+')('+JSON.stringify(key)+',('+pcWebMd5.toString()+'))');save();
    if(!report.session.logged_in)throw Error('Official PC HTTP session needs login');
    if(!report.session.freshness_confirmed)throw Error('PC authentication response freshness unconfirmed');
    const plans=[
      ['home-left','/c/f/pc/homeSidebarLeft','GET',{}],
      ['home-right','/c/f/pc/homeSidebarRight','GET',{}],
      ['publish-config','/c/f/pc/publishConf','POST',{}],
      ['forum-history','/c/f/forum/gethistoryforum_pc','FORM_DATA',{history:'[]'}],
      ['own-private-info','/c/u/user/getPrivateInfo_pc','GET',{}],
      ['agree-notifications','/c/u/feed/agreeme_pc','POST',{pn:1,rn:2,_client_type:20}],
      ['mention-notifications','/c/u/feed/atme_pc','POST',{pn:1,rn:2,_client_type:20}],
      ['reply-notifications','/c/u/feed/replyme_pc','POST',{pn:1,rn:2,_client_type:20}],
      ['thread','/c/f/pb/page_pc','POST',{kz:options.thread,pn:1,rn:20}],
      ['own-forums','/c/f/pc/myForumList','GET',{pn:1,rn:10}]
    ];
    if(options.forum)plans.push(['forum','/c/f/frs/page_pc','POST',{kw:options.forum,pn:1,is_newfrs:1,is_newfeed:1,rn:30,rn_need:10}]);
    for(const[name,api,kind,data]of plans){
      const method=kind==='FORM_DATA'?'POST':kind,item={name,path:api,method,input_fields:[...Object.keys(data),...(name==='own-forums'?['portrait']:[])],observed_at_utc:new Date().toISOString()};
      const request={path:api,method,data,formData:kind==='FORM_DATA',...(name==='thread'?{expectedThread:options.thread}:{}),...(name==='forum'?{expectedForum:options.forum}:{})};
      try{Object.assign(item,await client.evaluate('(async()=>{const s=window['+JSON.stringify(key)+'];const request='+JSON.stringify(request)+';'+(name==='own-forums'?'request.data.portrait=s.portrait;':'')+'return s.request(request);})()'));}catch{item.local_error='Direct HTTP request failed or timed out';}
      item.status=classifyPcWebResult(item);report.results.push(item);save();console.log(JSON.stringify({name,path:api,transport:item.transport??null,status:item.status,error_code:item.error_code??null}));
    }
    report.summary={recorded_api_operations:report.results.length,identity_http_reads:report.session.identity_http_reads,statuses:Object.fromEntries([...new Set(report.results.map(x=>x.status))].map(s=>[s,report.results.filter(x=>x.status===s).length]))};
    if(report.results.some(pcReadFailed)){report.failure='One or more direct PC reads failed business, freshness or object checks';process.exitCode=1;}
  }catch(e){report.failure=e.message;process.exitCode=1;}
  finally{if(client)await client.evaluate('delete window['+JSON.stringify(key)+']').catch(()=>{});client?.close();report.finished_at_utc=new Date().toISOString();save();fs.closeSync(fd);console.log(JSON.stringify({output,summary:report.summary??null,failure:report.failure??null}));}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(()=>{console.error('PC verification setup failed; check arguments, browser port and output path');process.exitCode=1;});

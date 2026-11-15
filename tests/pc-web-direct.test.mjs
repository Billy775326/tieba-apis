import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {pcWebMd5,installPcDirectSession} from '../src/pc-web-direct.mjs';
import {classifyPcWebResult,pcReadFailed} from '../src/pc-web-validation.mjs';
import {parsePcReadArgs} from '../scripts/verify-pc-web.mjs';

test('PC signing matches independent MD5 across UTF-8 and block boundaries',()=>{
  for(const text of ['', 'abc', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(1000), '贴吧接口'])assert.equal(pcWebMd5(text),crypto.createHash('md5').update(text).digest('hex'));
  assert.equal(parsePcReadArgs(['--refresh-session']).refreshSession,true);
});

async function fixture(t) {
  const requests=[];let count=0;
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost');let text='';for await(const part of req)text+=part;
    const params=req.method==='GET'?url.searchParams:new URLSearchParams(text);
    requests.push({url:url.href,method:req.method,params,headers:req.headers});res.setHeader('Content-Type','application/json');
    if(url.pathname==='/f/user/json_userinfo')return res.end(JSON.stringify({no:0,data:{is_login:1,user_portrait:'synthetic-private-portrait'}}));
    if(url.pathname==='/dc/common/tbs')return res.end(JSON.stringify({is_login:1,tbs:'synthetic-private-tbs'}));
    const signature=crypto.createHash('md5').update([...params].filter(([k])=>!['sign','sig'].includes(k)).sort(([a],[b])=>a>b?1:-1).map(([k,v])=>k+'='+v).join('')+'36770b1f34c9bbf2e7d1a99d2b82fa9e').digest('hex');
    if(params.get('sign')!==signature)return res.end(JSON.stringify({error_code:99,error_msg:'signature mismatch'}));
    if(params.get('cached')==='prefetch')res.setHeader('tieba-response-via','prefetch');
    if(params.get('cached')==='age')res.setHeader('Age','8');
    if(params.get('oversized')==='1')return res.end('x'.repeat(1048577));
    res.end(JSON.stringify({error_code:0,data:{thread:{id:'123456789',counter:++count}}}));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.closeAllConnections();server.close();});
  const origin='http://127.0.0.1:'+server.address().port;
  const window={};Object.defineProperty(window,'webpackJsonp',{get(){throw Error('Frontend wrapper must not be used');}});
  const context=vm.createContext({window,location:{origin:'https://tieba.baidu.com'},TextEncoder,TextDecoder,URL,URLSearchParams,FormData,AbortSignal,crypto:crypto.webcrypto,fetch:(url,init)=>{
    assert.equal(init.cache,'no-store');assert.equal(init.credentials,'same-origin');assert.equal(init.redirect,'error');return fetch(origin+new URL(url).pathname+new URL(url).search,init);
  }});
  const key='__pcDirect01234567';context.md5=pcWebMd5;context.key=key;
  const session=await vm.runInContext('('+installPcDirectSession.toString()+')(key,md5)',context);
  assert.equal(session.logged_in,true);assert.equal(session.identity_http_reads,2);
  return{session,state:window[key],requests};
}

test('direct calls send new signed HTTP requests and derive checks from those response bytes',async t=>{
  const {state,requests,session}=await fixture(t);
  const first=await state.request({path:'/c/f/pb/page_pc',method:'POST',data:{kz:'123456789'},expectedThread:'123456789'}),counter=state.lastData.thread.counter;
  const second=await state.request({path:'/c/f/pb/page_pc',method:'POST',data:{kz:'123456789'},expectedThread:'123456789'});
  assert.equal(state.lastData.thread.counter,counter+1);assert.notEqual(first.response_sha256,second.response_sha256);
  assert.equal(first.checks.exact_thread_id,true);assert.equal(first.frontend_http_wrapper_used,false);assert.equal(first.ui_action_performed,false);
  assert.equal(requests.length,4);assert.notEqual(requests[2].params.get('_'),requests[3].params.get('_'));
  assert.equal(requests[2].params.get('tbs'),'synthetic-private-tbs');assert.equal(requests[2].params.get('_client_type'),'20');
  const projected=JSON.stringify({session,first,second});assert(!projected.includes('synthetic-private-tbs'));assert(!projected.includes('synthetic-private-portrait'));
});

test('prefetched or aged responses cannot pass a current-state verification',async t=>{
  const {state}=await fixture(t);
  for(const cached of ['prefetch','age']){const result=await state.request({path:'/c/f/pb/page_pc',method:'GET',data:{cached},expectedThread:'123456789'});assert.equal(result.checks.exact_thread_id,true);assert.equal(result.freshness_confirmed,false);const status=classifyPcWebResult(result);assert.equal(status,'freshness-unconfirmed');assert(pcReadFailed({status}));}
});

test('rejected paths and oversized replies never leave prior data as the latest response',async t=>{
  const {state,requests}=await fixture(t);const count=requests.length;
  await assert.rejects(state.request({path:'https://example.invalid/c/f/pb/page_pc'}),/Unreviewed/);assert.equal(requests.length,count);
  await state.request({path:'/c/f/pb/page_pc',data:{}});assert(state.lastData.thread);
  await assert.rejects(state.request({path:'https://example.invalid/c/f/pb/page_pc'}),/Unreviewed/);assert.equal(state.lastData,null);
  await state.request({path:'/c/f/pb/page_pc',data:{}});assert(state.lastData.thread);
  await assert.rejects(state.request({path:'/c/f/pb/page_pc',data:{oversized:1}}),/size limit/);assert.equal(state.lastData,null);assert.equal(state.lastRaw,null);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import util from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {TiebaApi,TiebaApiError,TiebaAuth,loadConfig} from '../src/index.mjs';
import {bytesField as b,intField as i,fields,first} from '../src/protobuf.mjs';

const envelope=data=>Buffer.concat([b(1,i(1,0)),b(2,data)]);
const reply=raw=>async(url,options)=>{options.onBody(raw);return {http_status:200,response_sha256:crypto.createHash('sha256').update(raw).digest('hex'),response_bytes:raw.length,classification:'response-received-unverified'};};
function temporary(t) {
 const root=fs.realpathSync(os.tmpdir()),dir=fs.mkdtempSync(path.join(root,'tieba-api-'));
 t.after(()=>{if(path.dirname(path.resolve(dir))!==root||!path.basename(dir).startsWith('tieba-api-'))throw Error('Unexpected temporary cleanup path');fs.rmSync(dir,{recursive:true,force:true});});return dir;
}

test('the public thread client preserves identifiers and selects readable fields',async()=>{
 const id='9007199254740993';
 const raw=envelope(Buffer.concat([b(8,Buffer.concat([i(1,id),b(3,'fixture thread')])),b(6,Buffer.concat([i(1,223),i(3,1),i(19,42),b(5,Buffer.concat([i(1,0),b(2,'fixture text')]))]))]));
 const api=new TiebaApi({transport:reply(raw)}),data=await api.getThread('https://tieba.baidu.com/p/'+id);
 assert.equal(data.thread.id,id);assert.equal(data.thread.title,'fixture thread');
 assert.equal(data.post_list[0].id,'223');assert.equal(data.post_list[0].author_id,'42');assert.equal(data.post_list[0].content[0].text,'fixture text');
 assert.equal(data.meta.error_code,'0');assert.equal(data.meta.command,302001);
});

test('credentials are encoded only in common request data and omitted from projected user output',async()=>{
 const secret='synthetic-bduss-for-tests',auth=new TiebaAuth({BDUSS:secret,tbs:'synthetic-tbs',uid:'42'});
 const raw=envelope(b(1,Buffer.concat([i(2,42),b(3,'fixture user'),b(29,secret)])));
 const transport=async(url,options)=>{
   assert(url.startsWith('https://tiebac.baidu.com/c/u/user/profile?'));
   assert.equal(options.headers.Cookie,undefined);assert.equal(options.authenticated,true);
   const begin=options.body.indexOf(Buffer.from('\r\n\r\n'))+4,end=options.body.lastIndexOf(Buffer.from('\r\n--'));
   const data=fields(first(fields(options.body.subarray(begin,end)),1)),common=fields(first(data,9));
   assert.equal(first(common,10).toString(),secret);
   return reply(raw)(url,options);
 };
 const data=await new TiebaApi({auth,transport}).getUserProfile('42');
 assert.equal(data.user.id,'42');assert.equal(data.user.name,'fixture user');
 for(const value of [JSON.stringify(data),JSON.stringify(auth),util.inspect(auth)])assert(!value.includes(secret));
});

test('business failures retain their code independently of HTTP 200 and data presence',async()=>{
 const raw=b(1,Buffer.concat([i(1,3110002),b(2,'untrusted response text')]));
 await assert.rejects(new TiebaApi({transport:reply(raw)}).getThread('42'),e=>e instanceof TiebaApiError&&e.kind==='business'&&e.code==='3110002'&&!e.message.includes('untrusted'));
});

test('missing, ambiguous and malformed success payloads never become valid results',async()=>{
 const cases=[b(2,b(8,i(1,42))),b(1,Buffer.concat([i(1,0),i(1,3)])),b(1,i(1,0)),envelope(b(8,b(1,'wrong wire')))];
 for(const raw of cases)await assert.rejects(new TiebaApi({transport:reply(raw)}).getThread('42'),e=>e.kind==='protocol');
 await assert.rejects(new TiebaApi({transport:reply(envelope(b(8,i(1,43))))}).getThread('42'),e=>e.kind==='object-mismatch');
});

test('empty search results are valid while a missing business envelope is not',async()=>{
 const data=await new TiebaApi({transport:reply(envelope(Buffer.alloc(0)))}).searchForums('fixture');
 assert.deepEqual(data.fuzzy_match,[]);assert.equal(data.exact_match,undefined);
 await assert.rejects(new TiebaApi({transport:reply(b(1,i(1,0)))}).searchForums('fixture'),e=>e.kind==='protocol');
});

test('invalid targets and oversized pagination are rejected before transport',async()=>{
 const api=new TiebaApi({transport:()=>{assert.fail('Invalid inputs reached transport');}});
 await assert.rejects(api.getThread(9007199254740992),/decimal string/);
 await assert.rejects(api.getThread(['42']),/Thread target/);
 await assert.rejects(api.getPostReplies(['42'],'223'),/Thread target/);
 await assert.rejects(api.getThread('42','invalid-options'),/options object/);
 await assert.rejects(api.getThread('42',{signal:{}}),/AbortSignal/);
 await assert.rejects(api.getThread('https://example.com/p/42'),/official Tieba/);
 await assert.rejects(api.getThread('42',{rn:101}),/rn/);
 await assert.rejects(api.getForumThreads(' '),/forum name/);
 await assert.rejects(api.getUserProfile('0'),/int64/);
 await assert.rejects(api.getPostReplies('42','1',{pn:0}),/pn/);
});

test('configuration paths resolve beside their file and malformed account JSON is not echoed',t=>{
 const dir=temporary(t),config=path.join(dir,'config.json');
 fs.writeFileSync(config,JSON.stringify({accountPath:'account.json',outputDir:'responses',timeoutMs:2500}));
 const result=loadConfig(config);assert.equal(result.accountPath,path.join(dir,'account.json'));assert.equal(result.outputDir,path.join(dir,'responses'));assert.equal(result.timeoutMs,2500);
 fs.writeFileSync(path.join(dir,'account.json'),'{"BDUSS":"synthetic-secret-invalid-json');
 assert.throws(()=>TiebaAuth.fromFile(result.accountPath),e=>!e.message.includes('synthetic-secret')&&/valid local account/.test(e.message));
 fs.writeFileSync(config,JSON.stringify({timeoutMs:Infinity,unknown:'fixture'}));assert.throws(()=>loadConfig(config),/Unknown configuration field/);
});

test('an empty reply first page may explicitly report 0/0 without losing parent identity checks',async()=>{
 const data=Buffer.concat([b(1,Buffer.concat([i(3,0),i(5,0)])),b(3,i(1,223))]);
 const api=new TiebaApi({transport:reply(envelope(data))});
 const result=await api.getPostReplies('42','223');
 assert.deepEqual(result.page,{current_page:0,total_page:0});assert.deepEqual(result.subpost_list,[]);
 await assert.rejects(api.getPostReplies('42','224'),e=>e.kind==='object-mismatch');
});

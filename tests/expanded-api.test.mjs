import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TiebaApi,TiebaAuth} from '../src/index.mjs';
import {bytesField as b,intField as i,fields,first} from '../src/protobuf.mjs';
const auth=new TiebaAuth({BDUSS:'synthetic-bduss',tbs:'synthetic-tbs',uid:'42'});
const reply=raw=>async(url,opts)=>{opts.onBody(raw);return {classification:'response-received-unverified',http_status:200,response_bytes:raw.length};};
const envelope=(data,{errorTag=1,dataTag=2}={})=>Buffer.concat([b(errorTag,i(1,0)),b(dataTag,data)]);
function packet(opts){const start=opts.body.indexOf(Buffer.from('\r\n\r\n'))+4,end=opts.body.lastIndexOf(Buffer.from('\r\n--'));return fields(first(fields(opts.body.subarray(start,end)),1));}

test('tail and privacy responses use their explicit reversed envelope tags',async()=>{
 const tail=envelope(Buffer.concat([b(1,Buffer.concat([i(1,23),i(2,0),b(3,'fixture')])),b(2,'#646566'),b(3,'#646566')]),{errorTag:2,dataTag:1});
 const api=new TiebaApi({auth,transport:reply(tail)});const data=await api.getOwnTails();
 assert.equal(data.tailList[0].tailId,23);assert.equal(data.tailList[0].is_selected,0);assert.equal(data.tailList[0].tailContent,'fixture');assert.deepEqual(data.colorList,['#646566']);
 const privacy=envelope(Buffer.concat([i(2,3),b(5,Buffer.concat([i(1,42),b(3,'private-email-not-projected')]))]),{errorTag:2,dataTag:1});
 const result=await new TiebaApi({auth,transport:reply(privacy)}).getOwnPrivacySettings();assert.deepEqual(result.user,{user_id:'42'});assert.equal(result.post,3);
 await assert.rejects(new TiebaApi({auth,transport:reply(envelope(Buffer.alloc(0)))}).getOwnTails(),e=>e.kind==='protocol');
 await assert.rejects(new TiebaApi({auth,transport:reply(envelope(b(5,i(1,43)),{errorTag:2,dataTag:1}))}).getOwnPrivacySettings(),e=>e.kind==='object-mismatch');
});

test('agreement notification cursors and IDs preserve all uint64 digits',async()=>{
 const id='18446744073709551615';const transport=async(url,opts)=>{
 const req=packet(opts);assert.equal(first(req,2),id);assert.equal(first(req,3),'2');assert.equal(first(req,7),'0');
 return reply(envelope(Buffer.concat([i(1,0),b(2,Buffer.concat([i(7,id),i(6,1),b(8,Buffer.concat([i(2,43),b(29,'credential-not-projected')]))]))])))(url,opts);};
 const result=await new TiebaApi({auth,transport}).getAgreeNotifications({cursor:id,rn:2});assert.equal(result.agree_list[0].id,id);assert.deepEqual(result.agree_list[0].agreeer,{id:'43'});assert.equal(result.has_more,0);
 const api=new TiebaApi({auth,transport:()=>assert.fail('Invalid cursor reached network')});
 for(const options of [null,[],42,'invalid'])await assert.rejects(api.getAgreeNotifications(options),/options object/);
 for(const cursor of ['-1','18446744073709551616',9007199254740992,{},null])await assert.rejects(api.getAgreeNotifications({cursor}),/cursor/);
});

test('homepage polling subscribes only to recovered homepage data types',async()=>{
 const transport=async(url,opts)=>{const req=packet(opts);assert.equal(first(req,2).toString(),'live,level,icon,festival_info');assert.equal(first(req,3),undefined);assert.equal(first(req,5),undefined);assert.equal(first(req,8),undefined);return reply(envelope(Buffer.concat([b(1,Buffer.concat([b(1,b(1,'https://example.com/icon')),b(3,'0')])),b(2,Buffer.alloc(0)),b(3,Buffer.alloc(0))])))(url,opts);};
 const data=await new TiebaApi({auth,transport}).getPollingStatus();assert.equal(data.live.is_end,'0');assert.equal(data.live.normal_config.icon_url,'https://example.com/icon');assert.deepEqual(data.icon,{});
});

test('location suggestions retain coordinate strings and reject mismatched field types',async()=>{
 const raw=envelope(b(1,Buffer.concat([b(1,'39.9'),b(2,'116.4'),b(3,'fixture location')])));
 const data=await new TiebaApi({transport:reply(raw)}).getLocationSuggestions('fixture');assert.equal(data.poi_info[0].lat,'39.9');assert.equal(data.poi_info[0].name,'fixture location');
 await assert.rejects(new TiebaApi({transport:reply(envelope(b(1,i(1,42))))}).getLocationSuggestions('fixture'),e=>e.kind==='protocol');
});

test('thread likes encode add as zero and cancel as one without claiming readback',async()=>{
 const calls=[];const transport=async(url,opts)=>{const form=new URLSearchParams(opts.body.toString());calls.push(form);assert.equal(new URL(url).pathname,'/c/c/agree/opAgree');assert.equal(form.get('thread_id'),'9007199254740993');assert.equal(form.get('obj_type'),'3');assert.equal(form.get('agree_type'),'2');assert.equal(form.get('BDUSS'),'synthetic-bduss');assert.equal(opts.headers.Cookie,undefined);assert.equal(opts.headers.needSig,'1');return reply(Buffer.from('{"error_code":"0"}'))(url,opts);};
 const api=new TiebaApi({auth,transport});const a=await api.setThreadLike('9007199254740993','7',true);const c=await api.setThreadLike('9007199254740993','7',false);
 assert.equal(calls[0].get('op_type'),'0');assert.equal(calls[1].get('op_type'),'1');assert.deepEqual(Object.keys(a).sort(),['acknowledged','meta']);assert.equal(c.acknowledged,true);assert.equal(a.meta.command,null);
});

test('single follower removal cannot invoke the bulk forbidden-follower operation',async()=>{
 const api=new TiebaApi({auth,transport:async(url,opts)=>{assert.equal(new URL(url).pathname,'/c/c/user/removeFans');const f=new URLSearchParams(opts.body.toString());assert.equal(f.get('fans_uid'),'9007199254740993');assert.equal(f.get('tbs'),'synthetic-tbs');return reply(Buffer.from('{"error_code":0,"info":[]}'))(url,opts);}});
 assert.equal((await api.removeFollower('9007199254740993')).acknowledged,true);
});

test('new authenticated operations reject missing credentials, TBS, IDs and invalid inputs before transport',async()=>{
 const transport=()=>assert.fail('Invalid request reached transport'),anonymous=new TiebaApi({transport}),api=new TiebaApi({auth,transport});
 for(const call of [()=>anonymous.getOwnTails(),()=>anonymous.getOwnPrivacySettings(),()=>anonymous.getAgreeNotifications(),()=>anonymous.getPollingStatus(),()=>anonymous.removeFollower('42'),()=>anonymous.setThreadLike('4','7',true)])await assert.rejects(call(),/authentication/);
 await assert.rejects(new TiebaApi({auth:new TiebaAuth({BDUSS:'fixture'}),transport}).getOwnPrivacySettings(),/own uid/);
 await assert.rejects(new TiebaApi({auth:new TiebaAuth({BDUSS:'fixture'}),transport}).removeFollower('42'),/TBS/);
 await assert.rejects(api.removeFollower('0'),/int64/);await assert.rejects(api.setThreadLike('4','7',1),/boolean/);await assert.rejects(api.removeFollower('42',{signal:{}}),/AbortSignal/);
});

test('JSON writes require an explicit typed business status and retain server failures',async()=>{
 for(const raw of ['{}','{"error_code":false}','{"error_code":null}','{"error_code":{}}','not-json'])await assert.rejects(new TiebaApi({auth,transport:reply(Buffer.from(raw))}).removeFollower('43'),e=>e.kind==='protocol');
 await assert.rejects(new TiebaApi({auth,transport:reply(Buffer.from('{"error_code":1990043,"error_msg":"private-server-text"}'))}).removeFollower('43'),e=>e.kind==='business'&&e.code==='1990043'&&!e.message.includes('private-server-text'));
});

test('thread and profile projections expose explicit relationship state without defaulting missing state to zero',async()=>{
 const raw=envelope(b(8,Buffer.concat([i(1,42),b(126,Buffer.concat([i(1,'9007199254740993'),i(2,0),i(3,2)]))])));
 const data=await new TiebaApi({transport:reply(raw)}).getThread('42');assert.equal(data.thread.agree.agree_num,'9007199254740993');assert.equal(data.thread.agree.has_agree,0);
 const missing=await new TiebaApi({transport:reply(envelope(b(8,i(1,42))))}).getThread('42');assert.equal(missing.thread.agree,undefined);
});

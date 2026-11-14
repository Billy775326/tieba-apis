import{test}from'node:test';import assert from'node:assert/strict';import crypto from'node:crypto';
import{getImUserIdentities}from'../src/index.mjs';import{post}from'../src/http/transport.mjs';
const options={BDUSS:'synthetic-bduss',cuid:'synthetic-logical-device',userIds:['42']};
const reply=raw=>async(url,opts)=>{opts.onBody(Buffer.from(raw));return{classification:'response-received-unverified',http_status:200,response_bytes:Buffer.byteLength(raw)};};

test('IM identity reads preserve decimal JSON IDs above Number precision and use the recovered signature',async()=>{
 const uid='9007199254740993',uk='9223372036854775807';const transport=async(url,opts)=>{
 assert.equal(url,'https://pim.baidu.com/rest/3.0/im/get_user_info');assert.equal(opts.headers.Cookie,'BDUSS=synthetic-bduss');assert.equal(opts.credentialPolicy,'pim-identity-cookie');
 const raw=opts.body.toString(),body=JSON.parse(raw);assert(raw.includes('"bd_uids":['+uid+']'));assert(!Object.hasOwn(body,'account_type'));assert(Number.isSafeInteger(body.timestamp));assert(Math.abs(Date.now()/1000-body.timestamp)<5);
 assert.equal(body.sign,crypto.createHash('md5').update('synthetic-bduss'+body.timestamp).digest('hex'));assert.equal(body.device_type,2);
 return reply('{"error_code":0,"user_list":[{"bd_uid":'+uid+',"uk":'+uk+',"display_name":"fixture","BDUSS":"not-projected"}]}')(url,opts);};
 const data=await getImUserIdentities({...options,userIds:[uid],transport});assert.deepEqual(data.user_list,[{bd_uid:uid,uk,display_name:'fixture'}]);assert.equal(data.meta.error_code,'0');
});

test('IM identities require complete exact input matching and explicit business success',async()=>{
 for(const raw of ['{}','{"error_code":false}','{"error_code":0,"user_list":null}','{"error_code":0,"user_list":[{"bd_uid":42,"uk":1.5}]}'])await assert.rejects(getImUserIdentities({...options,transport:reply(raw)}),e=>e.kind==='protocol');
 for(const users of [[],[{bd_uid:43,uk:9}],[{bd_uid:42,uk:9},{bd_uid:42,uk:9}]])await assert.rejects(getImUserIdentities({...options,transport:reply(JSON.stringify({error_code:0,user_list:users}))}),e=>e.kind==='object-mismatch');
 await assert.rejects(getImUserIdentities({...options,transport:reply('{"error_code":300757}') }),e=>e.kind==='business'&&e.code==='300757');
});

test('invalid IM query inputs fail before transport and transport messages never expose credentials',async()=>{
 const transport=()=>assert.fail('Invalid input reached network');for(const patch of [{BDUSS:'x\r\nCookie:y'},{userIds:[]},{userIds:['42','042']},{userIds:[9007199254740992]},{userIds:['-1']},{userIds:['9223372036854775808']},{cuid:''},{signal:{}},{timeoutMs:0}])await assert.rejects(getImUserIdentities({...options,...patch,transport}));
 await assert.rejects(getImUserIdentities({...options,transport:()=>{throw Error('synthetic-bduss');}}),e=>e.kind==='transport'&&!e.message.includes('synthetic-bduss'));
});

test('Cookie opt-in is bounded to the exact authenticated PIM identity target and remains cancellable',async()=>{
 const abort=new AbortController();abort.abort();const opts={headers:{Cookie:'BDUSS=synthetic'},authenticated:true,credentialPolicy:'pim-identity-cookie',signal:abort.signal};
 const result=await post('https://pim.baidu.com/rest/3.0/im/get_user_info',opts);assert.equal(result.error,'ABORT_ERR');
 for(const url of ['https://user:pass@pim.baidu.com/rest/3.0/im/get_user_info','https://example.com/rest/3.0/im/get_user_info','http://pim.baidu.com/rest/3.0/im/get_user_info','https://pim.baidu.com/rest/3.0/im/send_msg','https://pim.baidu.com/rest/3.0/im/get_user_info?redirect=1'])await assert.rejects(async()=>post(url,opts),/credential policy/);
 await assert.rejects(async()=>post('https://pim.baidu.com/rest/3.0/im/get_user_info',{...opts,authenticated:false}),/credential policy/);
 await assert.rejects(async()=>post('https://pim.baidu.com/rest/3.0/im/get_user_info',{...opts,credentialPolicy:'body-only'}),/does not accept credentials/);
});

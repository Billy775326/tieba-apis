import{test}from'node:test';import assert from'node:assert/strict';
import{extractNetworkLiterals,normalizeSurface,classifyHost,dexStrings}from'../src/network-surface.mjs';

test('broader inventory includes REST, websocket and relative SDK routes without networking',()=>{
 const urls=extractNetworkLiterals('https://pim.baidu.com/rest/2.0/im/groupchat and wss://example.com/socket');assert.equal(urls.length,2);assert.equal(urls[0].scope,'tieba-im');assert.equal(urls[1].scheme,'wss');
 assert.equal(extractNetworkLiterals('/rest/5.0/generate_lcm_token')[0].family,'api-shaped');
 assert.equal(extractNetworkLiterals('c/f/pb/page')[0].path,'/c/f/pb/page');
 assert.equal(extractNetworkLiterals('Lcom/baidu/example;').length,0);assert.equal(extractNetworkLiterals('not a path').length,0);
});

test('public shapes never retain query values, URL credentials, fragments or long opaque identifiers',()=>{
 const r=normalizeSurface('https://synthetic-user:synthetic-pass@example.com/api/12345678/'+('a'.repeat(60))+'?BDUSS=synthetic-secret&pn=2#synthetic-fragment');
 assert.equal(r.path,'/api/:numeric-id/:opaque-segment');assert.deepEqual(r.query_keys,['BDUSS','pn']);assert(r.userinfo_omitted&&r.fragment_omitted&&r.query_values_omitted&&r.path_redacted);
 for(const privateValue of ['synthetic-user','synthetic-pass','synthetic-secret','synthetic-fragment','12345678','a'.repeat(60)])assert(!JSON.stringify(r).includes(privateValue));
});

test('origins and resources remain candidates rather than automatic API classifications',()=>{
 assert.equal(classifyHost('tieba.baidu.com'),'tieba-http');assert.equal(classifyHost('tieba.baidu.com.attacker.invalid'),'nonproduction-or-example');
 assert.equal(classifyHost('pim.baidu.com'),'tieba-im');assert.equal(classifyHost('10.2.3.4'),'nonproduction-or-example');
 assert.equal(normalizeSurface('https://example.com/icon.png').family,'resource-shaped');assert.equal(normalizeSurface('https://example.com/topic.html').family,'web-shaped');
 assert.equal(normalizeSurface('file:///local/path'),null);assert.equal(normalizeSurface('https://example.com/\ufffd'),null);
});

test('escaped asset URLs are decoded without evaluating JavaScript',()=>{
 const result=extractNetworkLiterals('var x="https:\\/\\/example.com/api/example?token=synthetic"; dangerous();');assert.equal(result[0].host,'example.com');assert.equal(result[0].path,'/api/example');assert.deepEqual(result[0].query_keys,['token']);
});

test('complete DEX table scanning rejects malformed offsets and unterminated strings',()=>{
 const value='rest/2.0/im/groupchat',data=Buffer.from(value+'\0'),b=Buffer.alloc(117+data.length);b.write('dex\n039\0');b.writeUInt32LE(b.length,32);b.writeUInt32LE(0x12345678,40);b.writeUInt32LE(1,56);b.writeUInt32LE(112,60);b.writeUInt32LE(116,112);b[116]=value.length;data.copy(b,117);
 assert.equal([...dexStrings(b,'fixture.dex')][0].value,value);
 const broken=Buffer.from(b);broken.writeUInt32LE(b.length+1,112);assert.throws(()=>[...dexStrings(broken,'fixture.dex')],/string length/);
 const unclosed=Buffer.from(b);unclosed[unclosed.length-1]=65;assert.throws(()=>[...dexStrings(unclosed,'fixture.dex')],/Unterminated/);
 assert.throws(()=>[...dexStrings(b.subarray(0,64),'fixture.dex')],/truncated/);
});

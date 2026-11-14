import {test} from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {deriveAppSocketKey,encodeAppSocketFrame,decodeAppSocketFrame} from '../src/index.mjs';
const secret='0123456789abcdefghijklmnopqrstuv';
const payload=Buffer.from('0801120766697874757265','hex');
test('App header uses big-endian command and signed sequence, independently matched to APK/JDK fixture',()=>{
 const frame=encodeAppSocketFrame({command:303017,sequence:-17,payload});
 assert.equal(frame.toString('hex'),'0800049fa9ffffffef0801120766697874757265');
 const decoded=decodeAppSocketFrame(frame);assert.equal(decoded.command,303017);assert.equal(decoded.sequence,-17);assert.deepEqual(decoded.payload,payload);
});
test('native PBKDF2 and AES match an independent Java JCE fixture',()=>{
 const key=deriveAppSocketKey(secret);assert.equal(key.toString('hex'),'53b798b41b71853396eb03933425d93ae7e0b17db63c2ec693c61b26631b309e');
 const encrypted=encodeAppSocketFrame({command:1001,sequence:1,payload,key});assert.equal(encrypted.subarray(9).toString('hex'),'bfb097fb4822967a84139e4ec9ef07d7');
 assert.deepEqual(decodeAppSocketFrame(encrypted,{key}).payload,payload);
 assert.throws(()=>decodeAppSocketFrame(encrypted),/session key/);
 const bad=Buffer.from(encrypted);bad[bad.length-1]^=1;assert.throws(()=>decodeAppSocketFrame(bad,{key}),/decryption failed/);
});
test('encrypted gzip responses may omit protobuf bit and carry length-prefixed extras',()=>{
 const key=deriveAppSocketKey(secret),extra=Buffer.from('synthetic-extra');
 const frame=encodeAppSocketFrame({command:205003,sequence:2147483647,payload,key,gzip:true,protobuf:false,extra});
 const d=decodeAppSocketFrame(frame,{key});assert.equal(d.flags,0xc4);assert.equal(d.protobuf,false);assert.deepEqual(d.extra,extra);assert.deepEqual(d.payload,payload);
});
test('bounded decoding rejects decompression bombs, malformed extras and unknown flags',()=>{
 const bomb=Buffer.concat([Buffer.from('40000003e900000001','hex'),zlib.gzipSync(Buffer.alloc(4096))]);assert.throws(()=>decodeAppSocketFrame(bomb,{maxBytes:256}),/decompression/);
 const malformed=Buffer.from('0c000003e900000001ffffffff','hex');assert.throws(()=>decodeAppSocketFrame(malformed),/extra length/);
 malformed[0]=1;assert.throws(()=>decodeAppSocketFrame(malformed),/flags/);
 assert.throws(()=>decodeAppSocketFrame(Buffer.alloc(8)),/frame/);
 assert.throws(()=>encodeAppSocketFrame({command:1001,sequence:2147483648}),/int32/);
 assert.throws(()=>encodeAppSocketFrame({command:1001,sequence:1,payload:Buffer.alloc(64),maxBytes:32}),/limit/);
 assert.throws(()=>deriveAppSocketKey('short'),/32-character/);
});

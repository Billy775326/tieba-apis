import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeTiebaJpeg} from '../src/media-envelope.mjs';
const jpeg=Buffer.from([255,216,255,192,0,8,8,0,3,0,2,1,255,217]);
test('decodes the observed Tieba transport header without treating it as image bytes',()=>{const r=decodeTiebaJpeg(Buffer.concat([Buffer.from('app:tiebaclient;type:0;'),jpeg]));assert.equal(r.wrapped,true);assert.equal(r.width,2);assert.equal(r.height,3);assert.deepEqual(r.data,jpeg);});
test('accepts a plain JPEG header but rejects truncation and unknown wrapper types',()=>{assert.equal(decodeTiebaJpeg(jpeg).wrapped,false);assert.throws(()=>decodeTiebaJpeg(jpeg.subarray(0,-2)),/truncated/);assert.throws(()=>decodeTiebaJpeg(Buffer.concat([Buffer.from('app:tiebaclient;type:1;'),jpeg])),/Unsupported/);assert.throws(()=>decodeTiebaJpeg(Buffer.from([255,216,255,192,0,20,255,217])),/Truncated/);});

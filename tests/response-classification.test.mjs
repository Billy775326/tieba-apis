import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeLegacyJson} from '../src/response-classification.mjs';
test('zero, false and string flag payloads are data without implying functional success',()=>{for(const data of [0,false,'0','2']){const r=summarizeLegacyJson({error_code:'0',data});assert.equal(r.status,'json-data-returned');assert.deepEqual(r.scalar_field_names,['data']);assert(!('data' in r));}});
test('empty payloads and response metadata do not count as business data',()=>{for(const data of ['',null,[],{}])assert.equal(summarizeLegacyJson({error_code:0,data,need_push:1,server_time:123}).status,'accepted-empty-response');});
test('missing or malformed status never becomes success because data exists',()=>{for(const code of [undefined,{},false,'success'])assert.equal(summarizeLegacyJson({error_code:code,data:[1]}).status,'unrecognized-business-status');assert.equal(summarizeLegacyJson({error_code:'1990043',data:[1]}).status,'business-error');});

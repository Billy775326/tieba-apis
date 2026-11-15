import{test}from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import path from'node:path';import os from'node:os';import crypto from'node:crypto';import{spawnSync}from'node:child_process';import{fileURLToPath}from'node:url';import{classifyPcWebResult,pcReadFailed}from'../src/pc-web-validation.mjs';import{parsePcReadArgs}from'../scripts/verify-pc-web.mjs';import{PcWebRpc}from'../src/pc-web-browser.mjs';
const builder=fileURLToPath(new URL('../scripts/build-pc-web-catalog.mjs',import.meta.url));
function fixture(t){const root=fs.realpathSync(os.tmpdir()),dir=fs.mkdtempSync(path.join(root,'tieba-pc-web-'));t.after(()=>{const target=fs.realpathSync(dir);if(path.dirname(target)!==root||!path.basename(target).startsWith('tieba-pc-web-'))throw Error('Unexpected cleanup path');fs.rmSync(target,{recursive:true,force:true});});return dir;}
test('PC status requires HTTP, explicit business status and actual object checks',()=>{
 for(const error_code of[undefined,null,false,0,'success'])assert.equal(classifyPcWebResult({http_status:200,error_code,checks:{exact_thread_id:true}}),'business-status-unconfirmed');
 assert.equal(classifyPcWebResult({http_status:200,error_code:'0',conflicting_business_status:true}),'business-status-conflict');
 assert.equal(classifyPcWebResult({http_status:200,error_code:'210009',checks:{exact_thread_id:true}}),'business-error');
 assert.equal(classifyPcWebResult({http_status:200,error_code:'0',data_keys:['error_code','logid']}),'accepted-empty-response');
 assert.equal(classifyPcWebResult({http_status:200,error_code:'0',data_keys:['thread'],checks:{exact_thread_id:false}}),'response-schema-validated');
 assert.equal(classifyPcWebResult({http_status:200,error_code:'0',checks:{exact_thread_id:true}}),'verified-read');
 assert.equal(classifyPcWebResult({http_status:200,error_code:'0',checks:{exact_thread_id:true},capture_attribution_valid:false}),'local-capture-unconfirmed');
});
test('PC read CLI defaults offline and validates the debugger port and official thread target',()=>{
 assert.equal(parsePcReadArgs([]).live,false);assert.equal(parsePcReadArgs(['--live','--port','9222','--thread','123456789']).port,9222);
 for(const args of[['--port','0'],['--port','65536'],['--port','https://example.invalid'],['--thread','https://example.invalid/p/42'],['--cookie','synthetic']])assert.throws(()=>parsePcReadArgs(args));
});
test('PC read CLI preserves existing output before any browser access',t=>{
 const dir=fixture(t),output=path.join(dir,'preserved.json');fs.writeFileSync(output,'synthetic preserved data');const entry=fileURLToPath(new URL('../scripts/verify-pc-web.mjs',import.meta.url));const result=spawnSync(process.execPath,[entry,'--live','--port','1','--thread','123456789','--output',output],{encoding:'utf8',timeout:5000});assert.equal(result.status,1);assert.equal(fs.readFileSync(output,'utf8'),'synthetic preserved data');
});
test('browser connection refuses invalid local ports before network access',async()=>{for(const p of[0,65536,'9222',NaN])await assert.rejects(PcWebRpc.connect(p),/valid local/);});
test('PC catalog retains method variants and role-required moderation without executing scripts',t=>{
 const dir=fixture(t),out=path.join(dir,'out.json'),source="const a={url:'/c/c/post/rmstore_pc',dataType:t.GET};const b={dataType:t.POST,url:'/c/c/post/rmstore_pc'};const c={url:'/c/c/bawu/commitgood_pc',dataType:t.POST};const d={url:'/c/c/bawu/delpost_pc',dataType:t.GET};throw Error('must not execute');";const b=Buffer.from(source);fs.writeFileSync(path.join(dir,'index.js'),b);fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify([{name:'index',url:'https://example.invalid/index.js',bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')}]));const r=spawnSync(process.execPath,[builder,dir,out],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const result=JSON.parse(fs.readFileSync(out));assert.equal(result.summary.path_method_candidates,4);assert.equal(result.summary.unique_paths,3);assert.equal(result.candidates.find(r=>r.path.endsWith('commitgood_pc')).execution_scope,'moderation-role-required');assert.equal(result.candidates.find(r=>r.path.endsWith('delpost_pc')).execution_scope,'own-test-content-only');assert(result.candidates.every(r=>r.status==='static-request-declaration'));
 fs.appendFileSync(path.join(dir,'index.js'),'changed');assert.notEqual(spawnSync(process.execPath,[builder,dir,out]).status,0);
});

test('read acceptance fails rejected business calls and object mismatches without treating empty samples as errors',()=>{assert(pcReadFailed({status:'business-error'}));assert(pcReadFailed({status:'response-schema-validated',checks:{exact_thread_id:false}}));assert(!pcReadFailed({status:'accepted-empty-response'}));assert(!pcReadFailed({status:'response-schema-validated'}));});

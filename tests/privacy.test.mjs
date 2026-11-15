import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inspectPrivacyFile,checkRepositoryPrivacy} from '../scripts/check-privacy.mjs';

const fakeId = '87654321987'; // Synthetic detector fixture, never used online.
test('privacy rules reject resource identifiers, credentials and private paths without echoing values',()=>{
  const target = 'https:'+'//tieba.baidu.com/p/'+fakeId;
  const samples = [
    ['docs/sample.md',target],
    ['evidence/thread-'+fakeId+'-validation.json','{}'],
    ['evidence/sample.json',JSON.stringify({thread_id:fakeId,forum_name:'synthetic-personal-forum-name'.replace('synthetic-','')})],
    ['src/sample.mjs','const BDUSS = "'+'untrusted-realistic-placeholder-value'+'";'],
    ['scripts/sample.mjs','const options={thread:"'+fakeId+'"};'],
    ['docs/sample.md','C:'+'/Users/'+'private-person-name/work'],
    ['docs/sample.md','-----BEGIN '+'PRIVATE KEY-----'],
  ];
  for (const [file,text] of samples) {
    const findings=inspectPrivacyFile(file,text);
    assert(findings.length>0,file);
    assert(findings.every(x=>Object.keys(x).sort().join(',')==='file,line,rule'));
    assert(!JSON.stringify(findings.map(({rule,line})=>({rule,line}))).includes(fakeId));
  }
  assert.equal(inspectPrivacyFile('docs/sample.md','a unique-synthetic-marker b',['unique-synthetic-marker'])[0].rule,'local-denylist-match');
});

test('privacy rules accept redacted live evidence, protocol metadata and declared synthetic URL fixture',()=>{
  assert.deepEqual(inspectPrivacyFile('evidence/sample.json',JSON.stringify({thread_id:'[redacted-thread-id]',sample_forum:'[redacted-forum-name]',http_status:200,command:'302001',checks:{thread_matches:true}})),[]);
  assert.deepEqual(inspectPrivacyFile('src/sample.mjs','const name = "thread_id"; const cookie = account.cookie;'),[]);
  const url='https:'+'//tieba.baidu.com/p/'+'123456789';
  assert.deepEqual(inspectPrivacyFile('tests/thread-target.test.mjs',url),[]);
  assert.equal(inspectPrivacyFile('tests/other.test.mjs',url).length,1);
});

test('staged privacy check inspects index bytes and ignores untracked local sessions',t=>{
  const tempRoot=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(tempRoot,'tieba-privacy-'));
  t.after(()=>{const resolved=fs.realpathSync(root);assert.equal(path.dirname(resolved),tempRoot);assert(path.basename(resolved).startsWith('tieba-privacy-'));fs.rmSync(resolved,{recursive:true,force:true});});
  const git=args=>execFileSync('git',args,{cwd:root,stdio:'pipe'});
  git(['init','--quiet']);
  fs.writeFileSync(path.join(root,'.gitignore'),'.local/\n');
  fs.mkdirSync(path.join(root,'.local'));fs.writeFileSync(path.join(root,'.local','session.json'),JSON.stringify({thread_id:fakeId}));
  const file=path.join(root,'README.md');
  fs.writeFileSync(file,'https:'+'//tieba.baidu.com/p/'+fakeId);git(['add','README.md','.gitignore']);
  fs.writeFileSync(file,'redacted description');
  assert.equal(checkRepositoryPrivacy({root}).findings.length,0);
  assert.equal(checkRepositoryPrivacy({root,staged:true}).findings[0].rule,'live-thread-url');
  git(['add','README.md']);assert.equal(checkRepositoryPrivacy({root,staged:true}).findings.length,0);
  git(['add','--force','.local/session.json']);
  assert.equal(checkRepositoryPrivacy({root,staged:true}).findings[0].rule,'runtime-artifact-tracked');
});

test('repository tracked content passes privacy policy',()=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  assert.deepEqual(checkRepositoryPrivacy({root}).findings,[]);
});

test('legacy live readers reject missing local forum input before loading fixtures or networking',()=>{
  const env={...process.env};delete env.TIEBA_TEST_FORUM;
  for(const entry of ['verify-app-reads.mjs','verify-legacy-reads.mjs','verify-reviewed-reads.mjs']){
    const result=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/'+entry,import.meta.url)),'--live'],{env,encoding:'utf8',timeout:5000});
    assert.equal(result.status,1);assert.match(result.stderr,/Explicit TIEBA_TEST_FORUM is required/);
  }
});

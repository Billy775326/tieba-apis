import {test} from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
const entry=fileURLToPath(new URL('../main.mjs',import.meta.url));
function invoke(args,cwd){return spawnSync(process.execPath,[entry,...args],{encoding:'utf8',cwd,timeout:5000});}
test('CLI defaults to offline help and refuses implicit live requests',()=>{
 const help=invoke([]);assert.equal(help.status,0);assert.match(help.stdout,/Explicit live reads/);
 const refused=invoke(['thread','42']);assert.equal(refused.status,1);assert.match(refused.stderr,/Explicit --live required/);
 const status=invoke(['status']);assert.equal(status.status,0);assert.equal(JSON.parse(status.stdout).summary.candidates,603);
});
test('CLI refuses to overwrite an existing file before any live request',t=>{
 const root=fs.realpathSync(os.tmpdir()),dir=fs.mkdtempSync(path.join(root,'tieba-api-'));
 t.after(()=>{if(path.dirname(path.resolve(dir))!==root||!path.basename(dir).startsWith('tieba-api-'))throw Error('Unexpected temporary cleanup path');fs.rmSync(dir,{recursive:true,force:true});});
 const output=path.join(dir,'account.json');fs.writeFileSync(output,'preserved fixture');
 const result=invoke(['thread','42','--live','--output',output],dir);
 assert.equal(result.status,1);assert.equal(fs.readFileSync(output,'utf8'),'preserved fixture');assert.match(result.stderr,/EEXIST/);
});

test('CLI records a structured failure in its newly reserved output',t=>{
 const root=fs.realpathSync(os.tmpdir()),dir=fs.mkdtempSync(path.join(root,'tieba-api-'));
 t.after(()=>{if(path.dirname(path.resolve(dir))!==root||!path.basename(dir).startsWith('tieba-api-'))throw Error('Unexpected temporary cleanup path');fs.rmSync(dir,{recursive:true,force:true});});
 const output=path.join(dir,'failure.json'),result=invoke(['thread','invalid-target','--live','--output',output],dir);
 assert.equal(result.status,1);assert.equal(result.stdout,'');
 const recorded=JSON.parse(fs.readFileSync(output,'utf8'));assert.equal(recorded.error.kind,'argument');assert.equal(recorded.meta,null);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';
const scanner=path.resolve('scripts/request-models.mjs');
function fixture(t){
 const root=fs.realpathSync(os.tmpdir()),dir=fs.mkdtempSync(path.join(root,'tieba-wire-'));t.after(()=>{const target=fs.realpathSync(dir);if(path.dirname(target)!==root||!path.basename(target).startsWith('tieba-wire-'))throw Error('Unexpected fixture cleanup path');fs.rmSync(target,{recursive:true,force:true});});const dex=path.join(dir,'dex');fs.mkdirSync(dex);
 const owners=['Ltbclient/CommonReq;','Lprotobuf/Legacy;','Lalaim/Message;','Lother/Unannotated;'];
 const strings=[...owners,'Ljava/lang/String;','Lcom/squareup/wire/ProtoField;','tag','value','syntheticSecretDefault'];const types=[0,1,2,3,4,5];
 const b=Buffer.alloc(4096);b.write('dex\n039\0');b.writeUInt32LE(0x12345678,40);let p=112;const strOff=p;p+=strings.length*4;const typeOff=p;p+=types.length*4;const fieldOff=p;p+=owners.length*2*8;const classOff=p;p+=owners.length*32;
 for(let n=0;n<strings.length;n++){b.writeUInt32LE(p,strOff+n*4);b[p++]=strings[n].length;p+=b.write(strings[n],p);b[p++]=0;}
 types.forEach((v,n)=>b.writeUInt32LE(v,typeOff+n*4));
 owners.forEach((owner,n)=>{for(let f=0;f<2;f++){const o=fieldOff+(n*2+f)*8;b.writeUInt16LE(n,o);b.writeUInt16LE(4,o+2);b.writeUInt32LE(f?8:7,o+4);}const def=classOff+n*32;b.writeUInt32LE(n,def);if(n===3)return;
 const ann=p;b[p++]=1;b[p++]=5;b[p++]=1;b[p++]=6;b[p++]=4;b[p++]=1;const set=p;b.writeUInt32LE(1,p);b.writeUInt32LE(ann,p+4);p+=8;const directory=p;b.writeUInt32LE(1,p+4);b.writeUInt32LE(n*2,p+16);b.writeUInt32LE(set,p+20);p+=24;b.writeUInt32LE(directory,def+20);});
 b.writeUInt32LE(p,32);for(const [count,off,header]of[[strings.length,strOff,56],[types.length,typeOff,64],[owners.length*2,fieldOff,80],[owners.length,classOff,96]]){b.writeUInt32LE(count,header);b.writeUInt32LE(off,header+4);}
 const bytes=b.subarray(0,p),name='classes.dex';fs.writeFileSync(path.join(dex,name),bytes);const provenance=path.join(dir,'source.json'),out=path.join(dir,'models.json');fs.writeFileSync(provenance,JSON.stringify({artifact:{sha256:'synthetic'},dex_files:[{name,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}]}));
 return {dex,out,provenance,run:(...args)=>spawnSync(process.execPath,[scanner,dex,out,provenance,...args],{encoding:'utf8'}),read:()=>JSON.parse(fs.readFileSync(out,'utf8'))};
}
test('complete Wire mode includes non-tbclient namespaces and excludes unannotated fields/classes',t=>{
 const f=fixture(t),r=f.run('--all-wire-models');assert.equal(r.status,0,r.stderr);const m=f.read().models;assert.deepEqual(m.map(x=>x.descriptor),['Ltbclient/CommonReq;','Lprotobuf/Legacy;','Lalaim/Message;']);assert(m.every(x=>x.fields.length===1&&x.fields[0].name==='value'));assert(!fs.readFileSync(f.out,'utf8').includes('syntheticSecretDefault'));
});
test('legacy selected and tbclient-only scopes preserve their original behavior',t=>{
 const f=fixture(t);for(const args of[[],['--all-models']]){const r=f.run(...args);assert.equal(r.status,0,r.stderr);const m=f.read().models;assert.equal(m.length,1);assert.equal(m[0].descriptor,'Ltbclient/CommonReq;');assert.equal(m[0].fields.length,2);}
});
test('complete mode refuses missing DEX files, provenance mismatches and ambiguous scope',t=>{
 const f=fixture(t);assert.notEqual(f.run('--all-wire-models','--all-models').status,0);
 const s=JSON.parse(fs.readFileSync(f.provenance,'utf8'));s.dex_files.push({name:'classes2.dex',sha256:'missing'});fs.writeFileSync(f.provenance,JSON.stringify(s));assert.match(f.run('--all-wire-models').stderr,/every provenance DEX/);
 s.dex_files.pop();s.dex_files[0].sha256='wrong';fs.writeFileSync(f.provenance,JSON.stringify(s));assert.match(f.run('--all-wire-models').stderr,/provenance mismatch/);
});

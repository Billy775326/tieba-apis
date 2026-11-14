import fs from 'node:fs';
import {bytesField} from './protobuf.mjs';

export class TiebaAuth {
  #bduss; #tbs; #uid;
  constructor({BDUSS,tbs='',uid}={}) {
    if(typeof BDUSS!=='string'||!BDUSS||/[\r\n\0]/.test(BDUSS))throw Error('Nonempty BDUSS required in the local account file');
    if(typeof tbs!=='string'||/[\r\n\0]/.test(tbs))throw Error('Invalid local TBS');
    if(uid!=null&&(typeof uid==='number'&&!Number.isSafeInteger(uid)||!/^\d+$/.test(String(uid))||BigInt(uid)<=0n||BigInt(uid)>0x7fffffffffffffffn))throw Error('Store uid as an exact positive int64 decimal string');
    this.#bduss=BDUSS;this.#tbs=tbs;this.#uid=uid==null?null:String(uid);
  }
  static fromFile(file) {
    let input;
    try {input=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}
    catch {throw Error('Cannot read a valid local account JSON file');}
    if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Local account object required');
    return new TiebaAuth(input);
  }
  get uid(){return this.#uid;}
  commonFields(){return [bytesField(10,this.#bduss),...(this.#tbs?[bytesField(11,this.#tbs)]:[])];}
  toJSON(){return {type:'TiebaAuth',credentialsProvided:true};}
  [Symbol.for('nodejs.util.inspect.custom')](){return this.toJSON();}
}

import fs from 'node:fs';
import path from 'node:path';

export const APP = Object.freeze({ clientType:2, version:'22.13.1.1', protocolVersion:'1.0.3', origin:'https://tiebac.baidu.com' });
export const DEFAULTS = Object.freeze({ timeoutMs:12000, maxResponseBytes:1048576 });
export function validateLimits({timeoutMs=DEFAULTS.timeoutMs,maxResponseBytes=DEFAULTS.maxResponseBytes}={}) {
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw Error('timeoutMs must be an integer in 1..60000');
  if(!Number.isSafeInteger(maxResponseBytes)||maxResponseBytes<1||maxResponseBytes>8388608)throw Error('maxResponseBytes must be an integer in 1..8388608');
  return {timeoutMs,maxResponseBytes};
}
export function loadConfig(file) {
  if(!file)return {...DEFAULTS,accountPath:null,outputDir:path.resolve('.local/output')};
  let input;
  try {input=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}
  catch {throw Error('Cannot read a valid configuration JSON file');}
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Configuration object required');
  if(Object.keys(input).some(k=>!['timeoutMs','maxResponseBytes','accountPath','outputDir'].includes(k)))throw Error('Unknown configuration field');
  for(const key of ['accountPath','outputDir'])if(input[key]!=null&&(typeof input[key]!=='string'||!input[key].trim()))throw Error('Invalid configuration path');
  const base=path.dirname(path.resolve(file));
  return {...validateLimits(input),accountPath:input.accountPath?path.resolve(base,input.accountPath):null,outputDir:path.resolve(base,input.outputDir??'output')};
}

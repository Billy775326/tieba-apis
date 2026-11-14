import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {TiebaApi,TiebaAuth,loadConfig} from './index.mjs';

const help=`Tieba APIs — Node.js 24+

Offline:
  node main.mjs --help
  node main.mjs status
  node scripts/catalog.mjs <keyword>

Explicit live reads:
  node main.mjs forum <forum-name> --live [--pn 1 --rn 20]
  node main.mjs thread <thread-id-or-url> --live [--pn 1 --rn 20]
  node main.mjs replies <thread-id-or-url> <post-id> --live [--pn 1]
  node main.mjs profile <user-id> --live [--pn 1 --rn 1]
  node main.mjs search-forum <keyword> --live

Common options: --config <local-json> --output <json-file>
Without --output, live results are saved under the configured outputDir.
stdout contains a response summary and file path, not message text or credentials.
IM login remains: node scripts/verify-im-login.mjs --live --account <local-json>
`;
const commands={forum:{arity:1,method:'getForumThreads',options:['pn','rn']},thread:{arity:1,method:'getThread',options:['pn','rn']},replies:{arity:2,method:'getPostReplies',options:['pn']},profile:{arity:1,method:'getUserProfile',options:['pn','rn']},'search-forum':{arity:1,method:'searchForums',options:[]}};
function parse(args) {
  const positional=[],options={};
  for(let index=0;index<args.length;index++) {
    const arg=args[index];
    if(!arg.startsWith('--')){positional.push(arg);continue;}
    const name=arg.slice(2);
    if(!['live','pn','rn','config','output'].includes(name)||name in options)throw Error('Unknown or duplicate option');
    if(name==='live'){options.live=true;continue;}
    const value=args[++index];if(value==null||value.startsWith('--'))throw Error('Option value required');
    if(['pn','rn'].includes(name)){
      if(!/^[1-9]\d*$/.test(value)||!Number.isSafeInteger(Number(value)))throw Error('Pagination option must be a positive integer');
      options[name]=Number(value);
    } else options[name]=value;
  }
  return {positional,options};
}
export async function run(args) {
  if(!args.length||args.length===1&&args[0]==='--help'){console.log(help);return;}
  if(args.length===1&&args[0]==='status') {
    const coverage=JSON.parse(fs.readFileSync(new URL('../evidence/current-api-coverage.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
    console.log(JSON.stringify({artifact:coverage.artifact,scope:coverage.scope,summary:coverage.summary},null,2));return;
  }
  const [command,...rest]=args,spec=commands[command];if(!spec)throw Error('Unknown command; use --help');
  const {positional,options}=parse(rest);
  if(positional.length!==spec.arity)throw Error('Incorrect command arguments; use --help');
  if(!options.live)throw Error('Explicit --live required for service requests');
  if(['pn','rn'].some(key=>key in options&&!spec.options.includes(key)))throw Error('Pagination option not supported by this command');
  const config=loadConfig(options.config),auth=config.accountPath?TiebaAuth.fromFile(config.accountPath):null;
  const api=new TiebaApi({auth,timeoutMs:config.timeoutMs,maxResponseBytes:config.maxResponseBytes});
  const target=path.resolve(options.output??path.join(config.outputDir,command+'-'+crypto.randomUUID()+'.json'));
  // Reserve the output before any network operation; never overwrite an existing response or account file.
  fs.mkdirSync(path.dirname(target),{recursive:true});
  const handle=fs.openSync(target,'wx',0o600);
  try {
    const result=await api[spec.method](...positional,Object.fromEntries(spec.options.filter(k=>k in options).map(k=>[k,options[k]])));
    fs.writeFileSync(handle,JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({command,output:target,error_code:result.meta.error_code,http_status:result.meta.http_status,response_sha256:result.meta.response_sha256}));
  } catch(error) {
    fs.writeFileSync(handle,JSON.stringify({error:{kind:error.kind??'argument',code:error.code??null,message:error.message},meta:error.meta??null},null,2)+'\n');
    throw error;
  } finally {fs.closeSync(handle);}
}

import {pathToFileURL} from 'node:url';
import {run} from './src/cli.mjs';
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  run(process.argv.slice(2)).catch(error=>{
    console.error(JSON.stringify({error:{kind:error.kind??'argument',code:error.code??null,message:error.message}}));
    process.exitCode=1;
  });
}

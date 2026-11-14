import {TiebaApi} from '../src/index.mjs';

// Importing this module performs no requests. Call explicitly with an official thread URL or ID.
export async function readThread(target,{signal}={}) {
  const api=new TiebaApi();
  return api.getThread(target,{pn:1,rn:2,signal});
}

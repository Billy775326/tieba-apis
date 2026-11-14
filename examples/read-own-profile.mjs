import {TiebaApi,TiebaAuth} from '../src/index.mjs';

// accountFile points to the same ignored JSON used by the existing verification tools.
export async function readOwnProfile(accountFile,{signal}={}) {
  const auth=TiebaAuth.fromFile(accountFile);
  if(!auth.uid)throw Error('Confirmed own uid required in the local account file');
  return new TiebaApi({auth}).getUserProfile(auth.uid,{signal});
}

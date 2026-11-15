import crypto from 'node:crypto';
import zlib from 'node:zlib';

export const APP_SOCKET_FLAGS = Object.freeze({encrypted:0x80,gzip:0x40,protobuf:0x08,extra:0x04});
export const APP_SOCKET_HEADER_BYTES = 9;
const KNOWN_FLAGS=0xcc;
const DEFAULT_FRAME_BYTES=1024*1024;
const MAX_FRAME_BYTES=8*1024*1024;
const SALT=Buffer.from([0xa4,0x0b,0xc8,0x34,0xd6,0x95,0xf3,0x13]);
/** APK ya.f: PBKDF2-HMAC-SHA1, five iterations, 256 bits. Input is a new per-session ASCII secret. */
export function deriveAppSocketKey(secret) {
  if(typeof secret!=='string'||!/^[a-z0-9]{32}$/.test(secret))throw Error('A 32-character lowercase alphanumeric session secret is required');
  return crypto.pbkdf2Sync(secret,SALT,5,32,'sha1');
}
function checkKey(key) {if(!Buffer.isBuffer(key)||key.length!==32)throw Error('A 256-bit session key is required');}
function signed(value,name) {if(!Number.isInteger(value)||value< -2147483648||value>2147483647)throw Error(name+' must be int32');return value;}
/** Encode the App frame carried inside a WebSocket binary message, not an IM LCP frame. */
export function encodeAppSocketFrame({command,sequence,payload=Buffer.alloc(0),key=null,gzip=false,protobuf=true,extra=null,maxBytes=DEFAULT_FRAME_BYTES}) {
  if(!Number.isInteger(command)||command<1||command>=1000000)throw Error('Socket command outside the APK command range');
  signed(sequence,'sequence');
  if(!Buffer.isBuffer(payload)||extra!==null&&!Buffer.isBuffer(extra))throw Error('Binary payload/extra required');
  if(!Number.isSafeInteger(maxBytes)||maxBytes<APP_SOCKET_HEADER_BYTES||maxBytes>MAX_FRAME_BYTES)throw Error('Invalid frame limit');
  if(typeof gzip!=='boolean'||typeof protobuf!=='boolean')throw Error('Explicit boolean frame flags required');
  let body=payload,flags=protobuf?8:0;
  if(extra!==null){const size=Buffer.alloc(4);size.writeUInt32BE(extra.length);body=Buffer.concat([size,extra,body]);flags|=4;}
  if(body.length>maxBytes-APP_SOCKET_HEADER_BYTES)throw Error('Frame payload limit exceeded');
  if(gzip){body=zlib.gzipSync(body);flags|=0x40;}
  if(key!==null){checkKey(key);const cipher=crypto.createCipheriv('aes-256-ecb',key,null);body=Buffer.concat([cipher.update(body),cipher.final()]);flags|=0x80;}
  if(body.length>maxBytes-APP_SOCKET_HEADER_BYTES)throw Error('Encoded frame limit exceeded');
  const header=Buffer.alloc(APP_SOCKET_HEADER_BYTES);header[0]=flags;header.writeInt32BE(command,1);header.writeInt32BE(sequence,5);return Buffer.concat([header,body]);
}
/** Decode one complete App binary message with bounded decompression; never accepts missing encryption keys. */
export function decodeAppSocketFrame(frame,{key=null,maxBytes=DEFAULT_FRAME_BYTES}={}) {
  if(!Number.isSafeInteger(maxBytes)||maxBytes<APP_SOCKET_HEADER_BYTES||maxBytes>MAX_FRAME_BYTES)throw Error('Invalid frame limit');
  if(!Buffer.isBuffer(frame)||frame.length<APP_SOCKET_HEADER_BYTES||frame.length>maxBytes)throw Error('Invalid or oversized App frame');
  const flags=frame[0];if(flags&~KNOWN_FLAGS)throw Error('Unsupported App frame flags');
  const command=frame.readInt32BE(1),sequence=frame.readInt32BE(5);if(command<0||command>=1000000)throw Error('Invalid Socket command');
  let body=frame.subarray(APP_SOCKET_HEADER_BYTES);
  if(flags&0x80){checkKey(key);try{const cipher=crypto.createDecipheriv('aes-256-ecb',key,null);body=Buffer.concat([cipher.update(body),cipher.final()]);}catch{throw Error('App frame decryption failed');}}
  if(flags&0x40){try{body=zlib.gunzipSync(body,{maxOutputLength:maxBytes-APP_SOCKET_HEADER_BYTES});}catch{throw Error('App frame decompression failed or exceeded limit');}}
  if(body.length>maxBytes-APP_SOCKET_HEADER_BYTES)throw Error('Decoded frame limit exceeded');
  let extra=null;if(flags&4){if(body.length<4)throw Error('Truncated App extra header');const length=body.readInt32BE(0);if(length<0||length>body.length-4)throw Error('Invalid App extra length');extra=body.subarray(4,4+length);body=body.subarray(4+length);}
  return {command,sequence,flags,encrypted:!!(flags&0x80),gzip:!!(flags&0x40),protobuf:!!(flags&8),extra,payload:body};
}

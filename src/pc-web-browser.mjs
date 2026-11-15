// Node.js CDP connection; browser session cookies remain inside Chrome.
export class PcWebRpc {
  constructor(ws){this.ws=ws;this.sequence=0;this.pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data),p=this.pending.get(m.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(Error('Browser command rejected')):p.resolve(m.result);};ws.onclose=()=>this.close();ws.onerror=()=>this.close();}
  static async connect(port){
    if(!Number.isInteger(port)||port<1||port>65535)throw Error('A valid local Chrome debugging port is required');
    const response=await fetch('http://127.0.0.1:'+port+'/json/list',{signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error('Chrome target list unavailable');const pages=await response.json();if(!Array.isArray(pages))throw Error('Invalid Chrome target list');
    const candidates=pages.filter(p=>{try{return p.type==='page'&&new URL(p.url).origin==='https://tieba.baidu.com'&&['/f','/'].includes(new URL(p.url).pathname);}catch{return false;}});
    for(const p of candidates){let client;try{const u=new URL(p.webSocketDebuggerUrl);if(u.protocol!=='ws:'||!['127.0.0.1','localhost'].includes(u.hostname)||u.port!==String(port))throw Error('Unreviewed debugger address');const ws=new WebSocket(u);await new Promise((ok,no)=>{const timer=setTimeout(()=>{ws.close();no(Error('Browser connection timeout'));},3000);ws.onopen=()=>{clearTimeout(timer);ok();};ws.onerror=()=>{clearTimeout(timer);no(Error('Browser connection failed'));};});client=new PcWebRpc(ws);await client.send('Runtime.evaluate',{expression:'1+1',returnByValue:true},2500);return client;}catch{client?.close();}}
    throw Error('Open a responsive official Tieba PC home or forum page in this Chrome session');
  }
  send(method,params={},timeoutMs=15000){if(this.closed||this.pending.size>=16)return Promise.reject(Error('Browser connection unavailable'));return new Promise((resolve,reject)=>{const id=++this.sequence,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Browser command timed out'));},timeoutMs);this.pending.set(id,{resolve,reject,timer});try{this.ws.send(JSON.stringify({id,method,params}));}catch{clearTimeout(timer);this.pending.delete(id);reject(Error('Browser command failed'));}});}
  async evaluate(expression){const r=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('Browser evaluation failed');return r.result?.value;}
  close(){if(this.closed)return;this.closed=true;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('Browser connection closed'));}this.pending.clear();this.ws.close();}
}

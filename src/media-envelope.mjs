export function decodeTiebaJpeg(buffer) {
  const header=Buffer.from('app:tiebaclient;type:0;');
  const wrapped=buffer.subarray(0,header.length).equals(header);
  const data=wrapped?buffer.subarray(header.length):buffer;
  if(data.length<4||data[0]!==255||data[1]!==216||data.at(-2)!==255||data.at(-1)!==217)throw Error('Unsupported or truncated JPEG response');
  let offset=2;
  while(offset+4<=data.length){
    if(data[offset]!==255)throw Error('Invalid JPEG marker');
    while(offset<data.length&&data[offset]===255)offset++;
    const marker=data[offset++];
    if(marker===217||marker===218)break;
    if(marker===1||marker>=208&&marker<=215)continue;
    if(offset+2>data.length)throw Error('Truncated JPEG segment');
    const size=data.readUInt16BE(offset);
    if(size<2||offset+size>data.length)throw Error('Truncated JPEG segment');
    if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){
      if(size<8)throw Error('Invalid JPEG frame');
      const height=data.readUInt16BE(offset+3),width=data.readUInt16BE(offset+5);
      if(!width||!height)throw Error('Empty JPEG frame');
      return {data,format:'jpeg',wrapped,width,height};
    }
    offset+=size;
  }
  throw Error('JPEG frame not found');
}

export function varint(value) {
  if (typeof value === "number" && !Number.isSafeInteger(value))
    throw Error("Use a decimal string or bigint for large integers");
  let n = BigInt(value);
  if (n < 0n || n > 0xffffffffffffffffn) throw Error("varint out of range");
  const out = [];
  do {
    const byte = Number(n & 127n);
    n >>= 7n;
    out.push(byte | (n ? 128 : 0));
  } while (n);
  return Buffer.from(out);
}
export function bytesField(tag, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return Buffer.concat([varint(tag * 8 + 2), varint(bytes.length), bytes]);
}
export function intField(tag, value) {
  return Buffer.concat([varint(tag * 8), varint(value)]);
}
export function fields(buffer) {
  const out = [];
  let offset = 0;
  const read = () => {
    let n = 0n;
    for (let i = 0; i < 10; i++) {
      if (offset >= buffer.length) throw Error("truncated varint");
      const b = buffer[offset++];
      if (i === 9 && b > 1) throw Error("varint overflow");
      n |= BigInt(b & 127) << BigInt(i * 7);
      if (!(b & 128)) return n;
    }
    throw Error("varint overflow");
  };
  while (offset < buffer.length) {
    const key = read(),
      tag = Number(key >> 3n),
      wire = Number(key & 7n);
    if (tag < 1 || tag > 536870911) throw Error("invalid tag");
    if (wire === 0) out.push({ tag, wire, value: read().toString() });
    else if (wire === 1 || wire === 2 || wire === 5) {
      const size = wire === 1 ? 8 : wire === 5 ? 4 : Number(read());
      if (!Number.isSafeInteger(size) || size > buffer.length - offset)
        throw Error("truncated field");
      out.push({ tag, wire, value: buffer.subarray(offset, offset + size) });
      offset += size;
    } else throw Error("unsupported wire type");
  }
  return out;
}
export const first = (list, tag) => list.find((f) => f.tag === tag)?.value;

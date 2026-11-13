import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const directory = process.argv[2],
  output = process.argv[3],
  provenance = process.argv[4];
if (!directory || !output || !provenance)
  throw Error(
    "Usage: node scripts/request-models.mjs DEX_DIRECTORY OUTPUT ENDPOINT_EVIDENCE",
  );
const source = JSON.parse(
  fs.readFileSync(provenance, "utf8").replace(/^\uFEFF/, ""),
);
const models = [];
for (const file of fs
  .readdirSync(directory)
  .filter((f) => /^classes\d*\.dex$/.test(f))
  .sort()) {
  const b = fs.readFileSync(path.join(directory, file));
  const expected = source.dex_files.find((d) => d.name === file);
  if (
    !expected ||
    crypto.createHash("sha256").update(b).digest("hex") !== expected.sha256
  )
    throw Error("DEX provenance mismatch: " + file);
  const u32 = (p) => b.readUInt32LE(p),
    u16 = (p) => b.readUInt16LE(p);
  const leb = (state) => {
    let result = 0,
      shift = 0;
    for (let n = 0; n < 5; n++) {
      const x = b.readUInt8(state.p++);
      result += (x & 127) * 2 ** shift;
      if (!(x & 128)) return result;
      shift += 7;
    }
    throw Error("ULEB128 overflow");
  };
  const strings = Array.from({ length: u32(56) }, (_, i) => {
    const s = { p: u32(u32(60) + i * 4) };
    leb(s);
    const end = b.indexOf(0, s.p);
    if (end < 0) throw Error("Unterminated DEX string");
    return b.toString("utf8", s.p, end);
  });
  const types = Array.from(
    { length: u32(64) },
    (_, i) => strings[u32(u32(68) + i * 4)],
  );
  const fields = Array.from({ length: u32(80) }, (_, i) => {
    const p = u32(84) + i * 8;
    return {
      owner: types[u16(p)],
      type: types[u16(p + 2)],
      name: strings[u32(p + 4)],
      field_index: i,
    };
  });
  function value(s) {
    const header = b.readUInt8(s.p++),
      kind = header & 31,
      size = (header >> 5) + 1;
    if (kind === 0x1c) {
      const n = leb(s);
      return Array.from({ length: n }, () => value(s));
    }
    if (kind === 0x1d) return annotation(s);
    if (kind === 0x1e) return null;
    if (kind === 0x1f) return header >> 5;
    let n = 0;
    for (let i = 0; i < size; i++) n += b.readUInt8(s.p++) * 2 ** (i * 8);
    if (kind === 0x17) return strings[n];
    if (kind === 0x18) return types[n];
    if (kind === 0x1b) return fields[n];
    return { encoded_type: kind, raw_unsigned: n, byte_width: size };
  }
  function annotation(s) {
    const type = types[leb(s)],
      count = leb(s),
      elements = {};
    for (let i = 0; i < count; i++) {
      const name = strings[leb(s)];
      elements[name] = value(s);
    }
    return { type, elements };
  }
  function annotations(offset) {
    if (!offset) return [];
    const count = u32(offset);
    return Array.from({ length: count }, (_, i) => {
      const p = u32(offset + 4 + i * 4);
      return { visibility: b.readUInt8(p), ...annotation({ p: p + 1 }) };
    });
  }
  for (let i = 0; i < u32(96); i++) {
    const p = u32(100) + i * 32,
      name = types[u32(p)];
    if (
      !/^Ltbclient\/(?:FrsPage|PbPage|PbFloor|SearchPostForum|Profile|UserProfile)\/(?:DataReq|[A-Za-z]+ReqIdl);$/.test(
        name,
      ) &&
      name !== "Ltbclient/CommonReq;"
    )
      continue;
    const directoryOffset = u32(p + 20),
      byIndex = new Map();
    if (directoryOffset) {
      const count = u32(directoryOffset + 4);
      for (let j = 0; j < count; j++) {
        const a = directoryOffset + 16 + j * 8;
        byIndex.set(u32(a), annotations(u32(a + 4)));
      }
    }
    models.push({
      dex: file,
      class_def_index: i,
      descriptor: name,
      fields: fields
        .filter((f) => f.owner === name)
        .map((f) => ({ ...f, annotations: byIndex.get(f.field_index) ?? [] })),
    });
  }
}
fs.writeFileSync(
  output,
  JSON.stringify(
    {
      schema_version: 1,
      artifact: source.artifact,
      dex_files: source.dex_files,
      method:
        "DEX class_defs, field_ids and encoded field annotations; no decompilation or execution",
      limitations: [
        "Boxed Java field types alone do not specify protobuf wire types.",
        "Only selected class descriptors are inventoried; request construction and required fields remain unverified.",
      ],
      models,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    models.map((m) => ({
      dex: m.dex,
      name: m.descriptor,
      fields: m.fields.length,
    })),
  ),
);

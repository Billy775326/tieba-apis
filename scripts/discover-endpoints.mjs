import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const [apk, directory, output] = process.argv.slice(2);
if (!apk || !directory || !output)
  throw new Error(
    "Usage: node scripts/discover-endpoints.mjs APK DEX_DIRECTORY OUTPUT",
  );
const endpoints = new Map();
const dexFiles = [];
for (const file of fs
  .readdirSync(directory)
  .filter((name) => /^classes\d*\.dex$/.test(name))
  .sort()) {
  const bytes = fs.readFileSync(path.join(directory, file));
  if (
    !/^dex\n0(?:35|37|38|39|40)\0$/.test(bytes.subarray(0, 8).toString("ascii"))
  )
    throw new Error(`Unsupported DEX magic: ${file}`);
  if (
    bytes.readUInt32LE(32) !== bytes.length ||
    bytes.readUInt32LE(40) !== 0x12345678
  )
    throw new Error(`Invalid DEX header: ${file}`);
  const count = bytes.readUInt32LE(56),
    table = bytes.readUInt32LE(60);
  if (table + count * 4 > bytes.length)
    throw new Error(`Invalid string table: ${file}`);
  for (let index = 0; index < count; index++) {
    let offset = bytes.readUInt32LE(table + index * 4);
    const dataOffset = offset;
    // Skip bounded ULEB128 UTF-16 length. Endpoint candidates use ASCII only.
    let byte,
      lengthBytes = 0;
    do {
      if (offset >= bytes.length || lengthBytes++ >= 5)
        throw new Error(`Invalid string length: ${file}:${index}`);
      byte = bytes[offset++];
    } while (byte & 128);
    const end = bytes.indexOf(0, offset);
    if (end < 0) throw new Error(`Unterminated string: ${file}:${index}`);
    const value = bytes.subarray(offset, end).toString("utf8");
    if (
      !/^(?:https?:\/\/[A-Za-z0-9.:-]+\/)?\/?(?:c\/[a-z]\/|mo\/[a-z]\/)/.test(
        value,
      ) ||
      /[^\x20-\x7e]/.test(value)
    )
      continue;
    if (!endpoints.has(value)) endpoints.set(value, []);
    endpoints
      .get(value)
      .push({ dex: file, string_index: index, string_data_offset: dataOffset });
  }
  dexFiles.push({
    name: file,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    string_count: count,
  });
}
const hash = crypto.createHash("sha256");
for await (const chunk of fs.createReadStream(apk)) hash.update(chunk);
const report = {
  schema_version: 1,
  artifact: {
    filename: path.basename(apk),
    size: fs.statSync(apk).size,
    sha256: hash.digest("hex"),
  },
  method:
    "DEX string_ids table, ASCII URL/path candidates; no bytecode call-site or runtime verification",
  limitations: [
    "String presence does not establish an active endpoint, HTTP verb, parameters, authentication or response schema.",
    "Dynamically constructed paths, native code, assets and URL prefixes outside c/<letter>/ and mo/<letter>/ remain outside coverage.",
  ],
  dex_files: dexFiles,
  candidates: [...endpoints]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, locations]) => ({
      value,
      status: "static-string",
      locations,
    })),
};
fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify({
    dex_files: dexFiles.length,
    candidates: endpoints.size,
    sha256: report.artifact.sha256,
  }),
);

export function parseThreadTarget(input) {
  let value = String(input);
  if (!/^\d+$/.test(value)) {
    const url = new URL(value);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.hostname !== "tieba.baidu.com" ||
      url.username ||
      url.password
    )
      throw Error("Expected an official Tieba thread URL");
    const match = url.pathname.match(/^\/p\/(\d+)\/?$/);
    if (!match) throw Error("Expected /p/<thread-id>");
    value = match[1];
  }
  const id = BigInt(value);
  if (id <= 0n || id > 0x7fffffffffffffffn)
    throw Error("Thread identifier outside positive int64 range");
  return id.toString();
}
import { bytesField, intField } from "./protobuf.mjs";
export function encodeThreadField(field, value) {
  const values = Array.isArray(value) ? value : [value];
  if (Array.isArray(value) && field.label !== "REPEATED")
    throw Error("Array supplied for non-repeated field");
  return Buffer.concat(
    values.map((item) => {
      if (field.datatype === "STRING")
        return bytesField(field.tag, String(item));
      if (
        ["INT32", "INT64", "UINT32", "UINT64", "BOOL"].includes(field.datatype)
      )
        return intField(field.tag, item);
      throw Error("Unsupported requested field: " + field.name);
    }),
  );
}

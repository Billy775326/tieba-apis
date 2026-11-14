import crypto from "node:crypto";
import zlib from "node:zlib";
import { bytesField, intField, fields, first } from "./protobuf.mjs";

export const IM_APP_ID = 10773430;
export const IM_SDK_VERSION = 11250036;
export const LCP_SDK_VERSION = "3460016";
export const MAX_IM_FRAME_BYTES = 1024 * 1024;
const MAGIC = Buffer.from([108, 99, 112, 1]);
const md5 = (value) => crypto.createHash("md5").update(value).digest("hex");

function jsonValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isSafeInteger(value)) return;
  if (Array.isArray(value)) { for (const item of value) jsonValue(item); return; }
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    for (const item of Object.values(value)) jsonValue(item);
    return;
  }
  throw Error("IM signing supports JSON values with safe integer numbers");
}

// This is the SDK JSON signature, distinct from the Tieba legacy form signature.
export function signImJson(parameters) {
  if (!parameters || Object.getPrototypeOf(parameters) !== Object.prototype || Object.hasOwn(parameters, "sign"))
    throw Error("Unsigned IM parameter object required");
  jsonValue(parameters);
  return md5(Object.keys(parameters).sort().map((key) => {
    const value = parameters[key];
    return key + "=" + (value !== null && typeof value === "object" ? JSON.stringify(value) : String(value));
  }).join(""));
}

export function signImGroup(timestampSeconds, bduss, appId = IM_APP_ID) {
  if (!Number.isSafeInteger(timestampSeconds) || timestampSeconds < 0 || typeof bduss !== "string" || !bduss)
    throw Error("Integer seconds and a nonempty local BDUSS are required");
  return md5(String(timestampSeconds) + bduss + appId);
}

export function lcpTokenParameters(cuid, timestampMs, appVersion = "22.13.1.1") {
  if (typeof cuid !== "string" || !cuid || !Number.isSafeInteger(timestampMs) || timestampMs < 0)
    throw Error("Logical client identifier and integer milliseconds required");
  return {
    request_id: String(timestampMs), cuid, device_type: "android", app_id: String(IM_APP_ID),
    app_version: appVersion, sdk_version: LCP_SDK_VERSION, ts: timestampMs,
    manufacture: "", model: "", user_key: "",
    sign: md5(String(IM_APP_ID) + cuid + "android" + timestampMs),
  };
}

export function encodeLcpRequest({ service, method, logId, body, needCommon = true }) {
  const request = Buffer.concat([intField(1, service), intField(2, method), intField(3, logId), intField(4, needCommon ? 1 : 0)]);
  const meta = Buffer.concat([bytesField(1, request), intField(3, 0), intField(4, logId), intField(9, 1)]);
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
  if (meta.length + payload.length > MAX_IM_FRAME_BYTES) throw Error("IM frame size limit");
  const head = Buffer.alloc(12);
  MAGIC.copy(head);
  head.writeUInt32BE(meta.length + payload.length, 4);
  head.writeUInt32BE(meta.length, 8);
  return Buffer.concat([head, meta, payload]);
}

export function encodeLcpLogin({ logId, token, cuid, timestampMs, appVersion = "22.13.1.1" }) {
  const common = Buffer.concat([
    bytesField(1, cuid), bytesField(2, "android"), bytesField(6, String(IM_APP_ID)),
    bytesField(7, appVersion), bytesField(8, LCP_SDK_VERSION), bytesField(9, "unknown"),
  ]);
  return bytesField(1, Buffer.concat([
    intField(1, logId), bytesField(2, token), bytesField(3, common),
    intField(4, timestampMs), intField(6, 1), intField(7, 0),
  ]));
}

function code(value) {
  return typeof value === "number" && Number.isSafeInteger(value) || typeof value === "string" && /^-?\d+$/.test(value)
    ? String(value) : null;
}

export function imBusinessStatus(value, rpcCode) {
  const rpc = code(rpcCode);
  if (rpc === null) return { status: "unrecognized-rpc-status", error_code: null };
  if (rpc !== "0") return { status: "rpc-error", error_code: rpc };
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { status: "unrecognized-business-status", error_code: null };
  const raw = Object.hasOwn(value, "err_code") ? value.err_code : value.error_code;
  const business = code(raw);
  return { status: business === null ? "unrecognized-business-status" : business === "0" ? "business-success" : "business-error", error_code: business };
}

export function decodeLcpFrame(packet) {
  if (!Buffer.isBuffer(packet) || packet.length < 12 || !packet.subarray(0, 4).equals(MAGIC)) throw Error("Invalid LCP header");
  const size = packet.readUInt32BE(4), metaSize = packet.readUInt32BE(8);
  if (size > MAX_IM_FRAME_BYTES || metaSize > size || packet.length !== size + 12) throw Error("Invalid or incomplete LCP frame length");
  const meta = fields(packet.subarray(12, 12 + metaSize));
  const response = first(meta, 2), notify = first(meta, 8);
  if ((!response && !notify) || (response && notify)) throw Error("Ambiguous or missing response metadata");
  const route = fields(response ?? notify);
  let body = packet.subarray(12 + metaSize);
  const compression = first(meta, 3) ?? "0";
  if (compression === "1") body = zlib.gunzipSync(body, { maxOutputLength: MAX_IM_FRAME_BYTES });
  else if (compression !== "0") throw Error("Unsupported LCP compression");
  const service = first(route, 1), method = first(route, 2), logId = first(route, 3);
  if (![service, method].every((v) => typeof v === "string" && /^[1-9]\d*$/.test(v)) ||
      response && !(typeof logId === "string" && /^\d+$/.test(logId))) throw Error("Invalid LCP routing metadata");
  const rpcCode = response ? first(route, 4) ?? null : null;
  if (rpcCode !== null && code(rpcCode) === null) throw Error("Invalid LCP RPC status");
  const result = {
    kind: notify ? "notification" : "response", service_id: service, method_id: method,
    log_id: logId, rpc_error_code: rpcCode, body,
  };
  if (result.service_id === "1") {
    const lcm = first(fields(body), 2);
    if (lcm) {
      const parsed = fields(lcm);
      result.lcm_response = { error_code: first(parsed, 2) ?? null, next_interval_ms: first(parsed, 4) ?? null };
    }
  } else {
    try { result.json = JSON.parse(body.toString("utf8")); }
    catch { result.json_decode_error = "non-json-payload"; }
    if (result.kind === "response") Object.assign(result, imBusinessStatus(result.json, rpcCode));
  }
  return result;
}

export class LcpFrameStream {
  constructor() { this.pending = Buffer.alloc(0); }
  push(chunk) {
    if (!Buffer.isBuffer(chunk)) throw Error("Buffer chunk required");
    if (this.pending.length + chunk.length > 2 * MAX_IM_FRAME_BYTES + 24) throw Error("LCP receive chunk size limit");
    const input = Buffer.concat([this.pending, chunk]);
    const decoded = [];
    let offset = 0;
    while (input.length - offset >= 12) {
      if (!input.subarray(offset, offset + 4).equals(MAGIC)) throw Error("Invalid LCP magic");
      const size = input.readUInt32BE(offset + 4), metaSize = input.readUInt32BE(offset + 8);
      if (size > MAX_IM_FRAME_BYTES || metaSize > size) throw Error("Invalid LCP frame length");
      if (input.length - offset < size + 12) break;
      decoded.push(decodeLcpFrame(input.subarray(offset, offset + size + 12)));
      offset += size + 12;
    }
    this.pending = Buffer.from(input.subarray(offset));
    if (this.pending.length > MAX_IM_FRAME_BYTES + 12) throw Error("LCP pending buffer size limit");
    return decoded;
  }
  finish() { if (this.pending.length) throw Error("Incomplete LCP stream"); }
}

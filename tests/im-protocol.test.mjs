import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { encodeLcpRequest, decodeLcpFrame, LcpFrameStream, imBusinessStatus, signImJson, signImGroup, lcpTokenParameters, MAX_IM_FRAME_BYTES } from "../src/im-protocol.mjs";
import { ImLcpClient } from "../src/im-lcp-client.mjs";
import { bytesField, intField, fields, first } from "../src/protobuf.mjs";

// Reply metadata bytes are an independent fixture: service=2, method=55, log=7, error=0.
function reply(body, compression = 0) {
  const meta = Buffer.concat([Buffer.from("12080802103718072000", "hex"), intField(3, compression), intField(4, 7)]);
  const head = Buffer.alloc(12);
  head.set([108, 99, 112, 1]);
  head.writeUInt32BE(meta.length + body.length, 4);
  head.writeUInt32BE(meta.length, 8);
  return Buffer.concat([head, meta, body]);
}

test("LCP request matches independent big-endian framing and protobuf bytes", () => {
  const packet = encodeLcpRequest({ service: 2, method: 55, logId: 7, body: "{}" });
  assert.equal(packet.toString("hex"), "6c63700100000012000000100a0808021037180720011800200748017b7d");
});

test("LCP correlation IDs preserve all 64-bit integer digits", () => {
  const id = "9007199254740993", packet = encodeLcpRequest({ service: 2, method: 93, logId: id, body: "{}" });
  const meta = fields(packet.subarray(12, 12 + packet.readUInt32BE(8)));
  assert.equal(first(meta, 4), id);
  assert.equal(first(fields(first(meta, 1)), 3), id);
  assert.throws(() => encodeLcpRequest({ service: 2, method: 93, logId: Number(id), body: "{}" }), /decimal string/);
});

test("fragmented and coalesced TLS data produce complete LCP replies", () => {
  const packet = reply(Buffer.from('{"err_code":0,"msgid":42}'));
  const stream = new LcpFrameStream();
  assert.deepEqual(stream.push(packet.subarray(0, 11)), []);
  const out = stream.push(Buffer.concat([packet.subarray(11), packet]));
  assert.equal(out.length, 2);
  assert.equal(out[0].service_id, "2");
  assert.equal(out[0].method_id, "55");
  assert.equal(out[0].rpc_error_code, "0");
  assert.equal(out[0].status, "business-success");
  assert.equal(out[0].json.msgid, 42);
  stream.finish();
});

test("truncated, oversized, invalid and ambiguous LCP input is rejected", () => {
  const packet = reply(Buffer.from('{}'));
  assert.throws(() => decodeLcpFrame(packet.subarray(0, -1)), /incomplete/);
  const bad = Buffer.from(packet); bad.writeUInt32BE(MAX_IM_FRAME_BYTES + 1, 4);
  assert.throws(() => new LcpFrameStream().push(bad), /frame length/);
  const invalid = Buffer.from(packet); invalid[0] = 0;
  assert.throws(() => decodeLcpFrame(invalid), /header/);
  const stream = new LcpFrameStream(); stream.push(packet.subarray(0, 4));
  assert.throws(() => stream.finish(), /Incomplete/);
  const ambiguous = Buffer.concat([bytesField(2, intField(1, 2)), bytesField(8, intField(1, 2))]);
  const head = Buffer.alloc(12); head.set([108,99,112,1]); head.writeUInt32BE(ambiguous.length,4); head.writeUInt32BE(ambiguous.length,8);
  assert.throws(() => decodeLcpFrame(Buffer.concat([head,ambiguous])), /Ambiguous/);
  const missingRoute = bytesField(2, intField(4, 0));
  const shortHead = Buffer.alloc(12); shortHead.set([108,99,112,1]); shortHead.writeUInt32BE(missingRoute.length,4); shortHead.writeUInt32BE(missingRoute.length,8);
  assert.throws(() => decodeLcpFrame(Buffer.concat([shortHead,missingRoute])), /routing/);
});

test("gzip payloads are bounded after decompression", () => {
  assert.equal(decodeLcpFrame(reply(zlib.gzipSync('{"err_code":0}'), 1)).error_code, "0");
  assert.throws(() => decodeLcpFrame(reply(zlib.gzipSync(Buffer.alloc(MAX_IM_FRAME_BYTES + 1)), 1)));
  assert.throws(() => decodeLcpFrame(reply(Buffer.from('{}'), 2)), /compression/);
});

test("missing or malformed IM business status never becomes success from RPC 0", () => {
  for (const value of [{}, {err_code:null}, {err_code:false}, {err_code:"success"}, {err_code:{},error_code:0}])
    assert.equal(imBusinessStatus(value, "0").status, "unrecognized-business-status");
  assert.equal(imBusinessStatus({err_code:0}, null).status, "unrecognized-rpc-status");
  assert.equal(imBusinessStatus({err_code:0}, "607").status, "rpc-error");
  assert.equal(imBusinessStatus({err_code:5,error_code:0}, "0").error_code, "5");
});

test("SDK JSON signatures sort keys and retain nested JSON representation", () => {
  const expected = crypto.createHash("md5").update('a=1b={"text":"fixture"}c=false').digest("hex");
  assert.equal(signImJson({c:false,b:{text:"fixture"},a:1}), expected);
  assert.throws(() => signImJson({sign:"already-signed"}), /Unsigned/);
  assert.throws(() => signImJson({id:9007199254740992}), /safe integer/);
  assert.throws(() => signImJson({data:undefined}), /JSON values/);
});

test("group and LCP bootstrap signatures use their distinct seconds/milliseconds inputs", () => {
  const group = crypto.createHash("md5").update("1700000000fixture-bduss10773430").digest("hex");
  assert.equal(signImGroup(1700000000,"fixture-bduss"), group);
  assert.throws(() => signImGroup(1700000000.5,"fixture-bduss"), /Integer seconds/);
  const token = lcpTokenParameters("fixture-cuid",1700000000000);
  assert.equal(token.ts,1700000000000);
  assert.equal(token.sign,crypto.createHash("md5").update("10773430fixture-cuidandroid1700000000000").digest("hex"));
  assert.equal(token.manufacture,"");
});

test("IM client rejects an unreviewed bootstrap host before sending a token", async () => {
  const client = new ImLcpClient({device:{cuid:"fixture"},bootstrap:{error_code:0,token:"fixture-token",protocols:[{protocol:"tls",domain:"example.invalid",port:"443"}]}});
  await assert.rejects(client.connect(), /Unreviewed/);
  assert.equal(client.socket,undefined);
  client.close(); client.close();
  assert.throws(() => client.request(2,50,{}), /unavailable/);
});

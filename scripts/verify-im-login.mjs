import fs from "node:fs";
import crypto from "node:crypto";
import { probe } from "./verify-read-api.mjs";
import { ImLcpClient } from "../src/im-lcp-client.mjs";
import { IM_APP_ID, IM_SDK_VERSION, lcpTokenParameters } from "../src/im-protocol.mjs";

if (!process.argv.includes("--live")) throw Error("Explicit --live required");
const index = process.argv.indexOf("--account");
if (index < 0 || !process.argv[index + 1]) throw Error("Local --account JSON path required");
let account;
try { account = JSON.parse(fs.readFileSync(process.argv[index + 1], "utf8").replace(/^\uFEFF/, "")); }
catch { throw Error("Cannot read a valid local account JSON file"); }
if (!account || typeof account !== "object" || Array.isArray(account)) throw Error("Local account object required");
if (typeof account.uid === "number" && !Number.isSafeInteger(account.uid)) throw Error("Store own uid as an exact decimal string");
if (typeof account.BDUSS !== "string" || !account.BDUSS || !/^\d+$/.test(String(account.uid))) throw Error("Confirmed BDUSS and own uid required in the local file");
fs.mkdirSync(".local", { recursive: true });
const run = crypto.randomUUID(), prefix = ".local/im-login-" + run;
const device = { cuid: crypto.createHash("md5").update(run).digest("hex").toUpperCase() + "|0" };
const report = { started_at_utc: new Date().toISOString(), scope: "Own-account IM login only; no messages, memberships or settings changed", logical_device: "New dedicated identifier; no physical Android device metadata claimed", responses: [] };
let client, raw, counter = 0;
try {
  const token = await probe("https://pim.baidu.com/rest/5.0/generate_lcm_token", {
    body: Buffer.from(JSON.stringify(lcpTokenParameters(device.cuid, Date.now()))),
    headers: { "Content-Type": "application/json" },
    onBody: (body) => { raw = body; fs.writeFileSync(prefix + "-bootstrap.bin", body); },
  });
  report.bootstrap = { http_status: token.http_status ?? null, response_sha256: token.response_sha256 ?? null, response_bytes: token.response_bytes ?? null };
  if (!raw) throw Error("LCP bootstrap transport incomplete");
  client = new ImLcpClient({ device, bootstrap: JSON.parse(raw.toString("utf8")), onFrame: (frame) => {
    fs.writeFileSync(prefix + "-payload-" + counter++ + ".bin", frame.body);
    report.responses.push({ service_id: frame.service_id, method_id: frame.method_id, rpc_error_code: frame.rpc_error_code, business_error_code: frame.error_code ?? frame.lcm_response?.error_code ?? null, payload_sha256: crypto.createHash("sha256").update(frame.body).digest("hex"), payload_bytes: frame.body.length });
  }});
  await client.connect();
  const login = await client.request(2, 50, {
    method: 50, appid: IM_APP_ID, device_id: "android_" + device.cuid, account_type: 1,
    token: account.BDUSS, client_id: "", version: 4, sdk_version: IM_SDK_VERSION,
    app_version: "22.13.1.1", app_open_type: 0, client_identifier: JSON.stringify({ zid: "", version_code: "" }),
    tail: 0, timeout: 10, user_type: 0,
  });
  report.tls_verified = client.tlsVerified;
  report.im_error_code = login.error_code;
  const id = login.json?.bd_uid;
  const exactId = typeof id === "string" || typeof id === "number" && Number.isSafeInteger(id);
  report.own_identity_matches = exactId && login.status === "business-success" && String(id) === String(account.uid);
  if (!report.own_identity_matches) throw Error("IM login did not return the confirmed own account identity");
} catch (error) { report.failure = error.message; process.exitCode = 2; }
finally {
  client?.close();
  report.finished_at_utc = new Date().toISOString();
  fs.writeFileSync(prefix + "-report.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ report: prefix + "-report.json", tls_verified: report.tls_verified ?? false, own_identity_matches: report.own_identity_matches ?? false, im_error_code: report.im_error_code ?? null, failure: report.failure ?? null }));
}

import { summarizeLegacyJson } from "../src/response-classification.mjs";
import {
  ALL_LEGACY_READ_PATHS as LEGACY_READ_PATHS,
  ADDITIONAL_READ_PATHS,
  SELF_READ_PATHS,
} from "../src/verification-plan.mjs";
import fs from "node:fs";
import { probe } from "./verify-read-api.mjs";
import { fields, first } from "../src/protobuf.mjs";
import { legacyForm } from "../src/legacy-signature.mjs";
const read = (p) =>
  JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
const testForum = process.env.TIEBA_TEST_FORUM?.trim();
if (!testForum || testForum.length > 256) throw Error("Explicit TIEBA_TEST_FORUM is required");
if (!process.argv.includes("--live")) throw Error("Explicit --live required");
const accountIndex = process.argv.indexOf("--account"),
  account = accountIndex >= 0 ? read(process.argv[accountIndex + 1]) : null;
const frs = fields(
    first(fields(fs.readFileSync(".local/frs-page1-response.bin")), 2),
  ),
  forum = fields(first(frs, 2));
const pb = fields(
    first(fields(fs.readFileSync(".local/pb-page-response.bin")), 2),
  ),
  thread = fields(first(pb, 8)),
  post = fields(first(pb, 6));
// Each path is explicitly reviewed as retrieval. Generic path prefixes do not authorize requests.
const paths = LEGACY_READ_PATHS;
const coverage = read("evidence/api-coverage.json"),
  allPaths = new Set(
    coverage.rows
      .filter((r) => r.category !== "nonproduction-or-other-origin")
      .map((r) => r.path),
  );
const cases = paths.filter(
  (p) =>
    allPaths.has(p) &&
    (!process.argv.includes("--additional") ||
      ADDITIONAL_READ_PATHS.includes(p)),
);
const values = {
  _client_type: "2",
  _client_version: "22.13.1.1",
  kw: testForum,
  word: testForum,
  keyword: testForum,
  fid: first(forum, 1),
  forum_id: first(forum, 1),
  tid: first(thread, 1),
  kz: first(thread, 1),
  pid: first(post, 1),
  uid: account?.uid ?? first(post, 19),
  user_id: account?.uid ?? first(post, 19),
  pn: "1",
  rn: "2",
  ...(account?.BDUSS ? { BDUSS: account.BDUSS } : {}),
  ...(account?.tbs ? { tbs: account.tbs } : {}),
  _timestamp: String(Date.now()),
};
const defaultBody = process.argv.includes("--signed")
  ? legacyForm(values)
  : Buffer.from(new URLSearchParams(values).toString());
const report = {
  schema_version: 1,
  artifact: coverage.artifact,
  started_at_utc: new Date().toISOString(),
  scope:
    "Explicit legacy JSON read hypotheses; no signature assumed or business-success promotion from HTTP 200",
  credentials_supplied: !!account?.BDUSS,
  signature_mode: process.argv.includes("--signed") ? "APK-legacy-MD5" : "none",
  results: [],
};
for (const path of cases) {
  let raw;
  const selfValues = Object.fromEntries(
    Object.entries(values).filter(([key]) => !["uid", "user_id"].includes(key)),
  );
  const body = SELF_READ_PATHS.has(path)
    ? process.argv.includes("--signed")
      ? legacyForm(selfValues)
      : Buffer.from(new URLSearchParams(selfValues).toString())
    : defaultBody;
  const r = await probe("https://tiebac.baidu.com" + path, {
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    authenticated: !!account?.BDUSS,
    profile: "legacy-json-read-hypothesis",
    onBody: (b) => (raw = b),
  });
  const row = {
    path,
    observed_at_utc: new Date().toISOString(),
    http_status: r.http_status ?? null,
    response_sha256: r.response_sha256 ?? null,
    response_bytes: r.response_bytes ?? null,
    credentials_supplied: !!account?.BDUSS,
    status: "transport-incomplete",
    transport_error: r.error ?? null,
    ...(r.redirect_origin ? { redirect_origin: r.redirect_origin } : {}),
  };
  if (raw) {
    fs.writeFileSync(
      ".local/legacy-" +
        Buffer.from(path).toString("base64url") +
        "-response.bin",
      raw,
    );
    try {
      const data = JSON.parse(raw.toString("utf8"));
      Object.assign(row, summarizeLegacyJson(data));
    } catch {
      row.status = r.http_status >= 300 && r.http_status < 400 ? "redirect-response" : "non-json-response";
    }
  }
  report.results.push(row);
  console.log(
    JSON.stringify({
      done: report.results.length,
      total: cases.length,
      path,
      status: row.status,
      error_code: row.error_code,
    }),
  );
  fs.writeFileSync(
    process.argv.includes("--additional")
      ? ".local/legacy-additional-validation.json"
      : process.argv.includes("--signed")
        ? ".local/legacy-signed-validation.json"
        : ".local/legacy-read-validation.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await new Promise((resolve) => setTimeout(resolve, 250));
}
report.finished_at_utc = new Date().toISOString();
report.summary = report.results.reduce((s, r) => {
  s[r.status] = (s[r.status] ?? 0) + 1;
  return s;
}, {});
fs.writeFileSync(
  process.argv.includes("--additional")
    ? ".local/legacy-additional-validation.json"
    : process.argv.includes("--signed")
      ? ".local/legacy-signed-validation.json"
      : ".local/legacy-read-validation.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report.summary));

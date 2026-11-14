import fs from "node:fs";
import { probe } from "./verify-read-api.mjs";
import {
  bytesField as s,
  intField as i,
  fields,
  first,
} from "../src/protobuf.mjs";
import { parseThreadTarget, encodeThreadField } from "../src/thread-target.mjs";
if (!process.argv.includes("--live"))
  throw Error("Explicit --live required for thread read verification");
const at = process.argv.indexOf("--thread");
if (at < 0 || !process.argv[at + 1]) throw Error("--thread URL or ID required");
const tid = parseThreadTarget(process.argv[at + 1]);
const contracts = JSON.parse(
  fs.readFileSync("evidence/protocol-contracts.json", "utf8"),
);
fs.mkdirSync(".local", { recursive: true });
const results = [];
async function call(name, path, cmd, namespace, params) {
  const contract = contracts.contracts.find((c) => c.namespace === namespace);
  if (!contract) throw Error("Missing protocol contract");
  const common = Buffer.concat([
    i(1, 2),
    s(2, "22.13.1.1"),
    i(8, Date.now()),
    s(24, "1.0.3"),
  ]);
  const parts = [];
  for (const f of contract.request_fields) {
    if (f.name === "common") parts.push(s(f.tag, common));
    else if (params[f.name] !== undefined) {
      parts.push(encodeThreadField(f, params[f.name]));
    }
  }
  const data = Buffer.concat(parts),
    wrapper = contract.request_wrapper_fields.find((f) => f.name === "data"),
    packet = wrapper ? s(wrapper.tag, data) : data,
    boundary = "----TiebaThreadReadVerification";
  let raw;
  const body = Buffer.concat([
    Buffer.from(
      "--" +
        boundary +
        '\r\nContent-Disposition: form-data; name="data"; filename="data"\r\nContent-Type: application/octet-stream\r\n\r\n',
    ),
    packet,
    Buffer.from("\r\n--" + boundary + "--\r\n"),
  ]);
  const transport = await probe(
    "https://tiebac.baidu.com/" + path + "?cmd=" + cmd + "&format=protobuf",
    {
      body,
      headers: { "Content-Type": "multipart/form-data; boundary=" + boundary },
      profile: "specified-thread-anonymous-read",
      onBody: (b) => (raw = b),
    },
  );
  const result = {
    name,
    path,
    command: String(cmd),
    http_status: transport.http_status ?? null,
    response_bytes: transport.response_bytes ?? null,
    response_sha256: transport.response_sha256 ?? null,
    status: "not-verified",
    checks: {},
  };
  results.push(result);
  let decoded;
  if (raw) {
    fs.writeFileSync(".local/thread-" + tid + "-" + name + ".bin", raw);
    try {
      const root = fields(raw),
        errorTag = contract.response_wrapper_fields.find(
          (f) => f.name === "error",
        )?.tag,
        dataTag = contract.response_wrapper_fields.find(
          (f) => f.name === "data",
        )?.tag,
        error = first(root, errorTag);
      result.error_code = error ? (first(fields(error), 1) ?? null) : null;
      const bytes = first(root, dataTag);
      if (bytes) decoded = fields(bytes);
    } catch (error) {
      result.decode_error = error.message;
    }
  } else result.transport_error = transport.error ?? transport.classification;
  return { result, data: decoded, contract };
}
function field(response, name) {
  const tag = response.contract.response_data_fields.find(
    (f) => f.name === name,
  )?.tag;
  return first(response.data ?? [], tag);
}
function verify(response, checks) {
  response.result.checks = checks;
  response.result.status =
    response.result.error_code === "0" &&
    Object.keys(checks).length > 0 &&
    Object.values(checks).every((v) => v === true)
      ? "verified-read"
      : "not-verified";
}
const report = {
  schema_version: 1,
  observed_at_utc: new Date().toISOString(),
  thread_url: "https://tieba.baidu.com/p/" + tid,
  thread_id: tid,
  authentication: "anonymous",
  artifact: contracts.artifact,
  results,
  fixture_summary: {},
  limitations: [
    "Only the supplied thread and bounded reply samples are exercised.",
    "No publishing, deletion, reactions, following or private messages are performed.",
    "Raw content and account identifiers remain in ignored local response files.",
  ],
};
try {
  const page = await call("page1", "c/f/pb/page", 302001, "PbPage", {
    kz: tid,
    pn: 1,
    rn: 20,
    floor_rn: 2,
  });
  const thread = field(page, "thread"),
    posts = (page.data ?? [])
      .filter(
        (f) =>
          f.tag ===
          page.contract.response_data_fields.find((f) => f.name === "post_list")
            ?.tag,
      )
      .map((f) => fields(f.value));
  verify(page, {
    thread_matches: !!thread && first(fields(thread), 1) === tid,
    posts_present: posts.length > 0,
  });
  page.result.post_count = posts.length;
  const metadata = field(page, "page");
  const pages = metadata ? fields(metadata) : [];
  const totalPages = first(pages, 5);
  report.fixture_summary.first_page_posts = posts.length;
  report.fixture_summary.total_pages = totalPages ?? null;
  report.fixture_summary.sampled_posts_with_subreplies = posts.filter(
    (p) => BigInt(first(p, 13) ?? "0") > 0n,
  ).length;
  if (page.result.status !== "verified-read")
    throw Error("Requested thread was not successfully returned");
  if (totalPages && BigInt(totalPages) > 1n) {
    const next = await call("page2", "c/f/pb/page", 302001, "PbPage", {
      kz: tid,
      pn: 2,
      rn: 2,
    });
    const t = field(next, "thread"),
      p = field(next, "page");
    verify(next, {
      thread_matches: !!t && first(fields(t), 1) === tid,
      page_matches: !!p && first(fields(p), 3) === "2",
    });
  }
  const originalIds = new Set(posts.map((p) => first(p, 1)).filter(Boolean));
  const list = await call(
    "post-list",
    "c/f/pb/getPostList",
    309446,
    "GetPostList",
    {
      kz: tid,
      floor_rn: 2,
      with_floor: 1,
      post_id: [...originalIds].slice(0, 3),
    },
  );
  const items = (list.data ?? [])
    .filter(
      (f) =>
        f.tag ===
        list.contract.response_data_fields.find((f) => f.name === "post_list")
          ?.tag,
    )
    .map((f) => fields(f.value));
  verify(list, {
    posts_present: items.length > 0,
    requested_posts_present: [...originalIds]
      .slice(0, 3)
      .every((id) => items.some((p) => first(p, 1) === id)),
  });
  list.result.post_count = items.length;
  const firstPage = await call(
    "first-page",
    "c/f/pb/firstPage",
    309751,
    "PbList",
    { kz: tid, pn: 1 },
  );
  const t = field(firstPage, "thread");
  verify(firstPage, { thread_matches: !!t && first(fields(t), 1) === tid });
  const parent = posts.find((p) => BigInt(first(p, 13) ?? "0") > 0n);
  if (parent) {
    const pid = first(parent, 1);
    const floor = await call("subreplies", "c/f/pb/floor", 302002, "PbFloor", {
      kz: tid,
      pid,
      pn: 1,
    });
    const p = field(floor, "post"),
      t = field(floor, "thread");
    const children = (floor.data ?? []).filter(
      (f) =>
        f.tag ===
        floor.contract.response_data_fields.find(
          (f) => f.name === "subpost_list",
        )?.tag,
    );
    verify(floor, {
      thread_matches: !!t && first(fields(t), 1) === tid,
      parent_matches: !!p && first(fields(p), 1) === pid,
      subreplies_present: children.length > 0,
    });
    floor.result.subreply_count = children.length;
  } else {
    report.fixture_summary.missing_subreply_fixture = true;
  }
} catch (error) {
  report.workflow_error = error.message;
}
fs.writeFileSync(
  ".local/thread-" + tid + "-verification.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
if (
  report.workflow_error ||
  report.fixture_summary.missing_subreply_fixture ||
  results.some((r) => r.status !== "verified-read")
)
  process.exitCode = 2;

import fs from "node:fs";
import { probe } from "./verify-read-api.mjs";
import {
  bytesField as bytes,
  intField as integer,
  fields,
  first,
} from "../src/protobuf.mjs";
const read = (p) =>
  JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
if (!process.argv.includes("--live")) throw Error("Explicit --live required");
const testForum = process.env.TIEBA_TEST_FORUM?.trim();
if (!testForum || testForum.length > 256) throw Error("Explicit TIEBA_TEST_FORUM is required");
const coverage = read("evidence/api-coverage.json"),
  contractFile = read("evidence/protocol-contracts.json"),
  allModels = read(".local/all-protocol-models.json");
if (
  coverage.artifact.sha256 !== contractFile.artifact.sha256 ||
  coverage.artifact.sha256 !== allModels.artifact.sha256
)
  throw Error("Artifact identity mismatch");
const accountPath = process.argv.includes("--account")
  ? process.argv[process.argv.indexOf("--account") + 1]
  : null;
const account = accountPath ? read(accountPath) : null;
const models = new Map(allModels.models.map((m) => [m.descriptor, m]));
const member = (d) =>
  (models.get(d)?.fields ?? []).flatMap((f) => {
    const a = f.annotations.find(
      (a) => a.type === "Lcom/squareup/wire/ProtoField;",
    );
    return a
      ? [
          {
            name: f.name,
            tag: a.elements.tag.raw_unsigned,
            type: a.elements.type?.name,
            descriptor: f.type,
            label: a.elements.label?.name,
          },
        ]
      : [];
  });
const frs = fields(
  first(fields(fs.readFileSync(".local/frs-page1-response.bin")), 2),
);
const forum = fields(first(frs, 2));
if (first(forum, 2)?.toString("utf8") !== testForum) throw Error("Local forum fixture does not match TIEBA_TEST_FORUM");
const pb = fields(
  first(fields(fs.readFileSync(".local/pb-page-response.bin")), 2),
);
const thread = fields(first(pb, 8)),
  post = fields(first(pb, 6));
const fixtures = {
  forum_id: first(forum, 1),
  thread_id: first(thread, 1),
  post_id: first(post, 1),
  public_user_id: first(post, 19),
};
const values = new Map([
  ["kw", testForum],
  ["word", testForum],
  ["keyword", testForum],
  ["forum_name", testForum],
  ["fid", fixtures.forum_id],
  ["forum_id", fixtures.forum_id],
  ["tid", fixtures.thread_id],
  ["kz", fixtures.thread_id],
  ["thread_id", fixtures.thread_id],
  ["pid", fixtures.post_id],
  ["post_id", fixtures.post_id],
  ["pn", 1],
  ["rn", 2],
  ["page", 1],
  ["page_no", 1],
  ["page_num", 1],
  ["page_size", 2],
]);
const publicUserModels = new Set([
  "Profile",
  "Personal",
  "UserPost",
  "GetUserInfo",
  "GetUserByTiebaUid",
]);
function wire(field, value) {
  if (field.datatype === "STRING") return bytes(field.tag, String(value));
  if (/^(?:U?INT(?:32|64)|BOOL|ENUM)$/.test(field.datatype ?? ""))
    return integer(field.tag, value);
  throw Error("Unsupported sampled field type: " + field.name);
}
function packet(contract) {
  const common = Buffer.concat([
    integer(1, 2),
    bytes(2, "22.13.1.1"),
    integer(8, Date.now()),
    bytes(24, "1.0.3"),
    ...(account?.BDUSS ? [bytes(10, account.BDUSS)] : []),
    ...(account?.tbs ? [bytes(11, account.tbs)] : []),
  ]);
  const parts = [],
    inputs = [],
    omitted = [];
  for (const field of contract.request_fields) {
    if (
      field.name === "common" &&
      field.descriptor === "Ltbclient/CommonReq;"
    ) {
      parts.push(bytes(field.tag, common));
      inputs.push("common");
      continue;
    }
    let value = values.get(field.name);
    if (["uid", "user_id", "friend_uid", "benefit_userid"].includes(field.name))
      value =
        account?.uid ??
        (publicUserModels.has(contract.namespace)
          ? fixtures.public_user_id
          : undefined);
    if (
      value !== undefined &&
      value !== null &&
      ["STRING", "INT32", "INT64", "UINT32", "UINT64", "BOOL", "ENUM"].includes(
        field.datatype,
      )
    ) {
      parts.push(wire(field, value));
      inputs.push(field.name);
    } else {
      omitted.push(field.name);
      if (field.label === "REQUIRED")
        throw Error("Missing required field: " + field.name);
    }
  }
  const data = Buffer.concat(parts),
    wrapper = contract.request_wrapper_fields.find((f) => f.name === "data");
  return { body: wrapper ? bytes(wrapper.tag, data) : data, inputs, omitted };
}
function decode(raw, contract) {
  const root = fields(raw),
    errorSpec = contract.response_wrapper_fields.find(
      (f) => f.name === "error",
    ),
    dataSpec = contract.response_wrapper_fields.find((f) => f.name === "data");
  if (!errorSpec || !dataSpec) throw Error("Unknown envelope fields");
  const errorBytes = first(root, errorSpec.tag),
    error = errorBytes ? fields(errorBytes) : [],
    code = first(error, 1) ?? null,
    dataBytes = first(root, dataSpec.tag),
    data = dataBytes ? fields(dataBytes) : null;
  return { code, data };
}
function shape(data, contract) {
  let recognized = 0;
  for (const value of data) {
    const field = contract.response_data_fields.find(
      (f) => f.tag === value.tag,
    );
    if (!field) continue;
    const numeric =
      /^(?:U?INT(?:32|64)|SINT(?:32|64)|BOOL|ENUM|FIXED(?:32|64)|SFIXED(?:32|64)|FLOAT|DOUBLE)$/.test(
        field.datatype ?? "",
      );
    const valid = numeric
      ? value.wire === 0 ||
        value.wire === 1 ||
        value.wire === 5 ||
        (value.wire === 2 && ["REPEATED", "PACKED"].includes(field.label))
      : value.wire === 2;
    if (!valid)
      throw Error("Response wire mismatch at declared tag " + field.tag);
    recognized++;
  }
  return recognized;
}
const candidates = coverage.rows.filter(
  (r) =>
    r.category === "reviewed-read-candidate" &&
    r.status !== "verified-read" &&
    r.constructor_commands.length === 1,
);
const cases = [
  ...new Map(
    candidates.map((row) => [
      row.path + "?cmd=" + (row.command_variant ?? row.constructor_commands[0]),
      row,
    ]),
  ).values(),
];
const output = {
  schema_version: 1,
  artifact: coverage.artifact,
  started_at_utc: new Date().toISOString(),
  authenticated: !!account?.BDUSS,
  scope:
    "Explicitly reviewed read candidates only; model/path association remains provisional until response validation",
  results: [],
};
for (const row of cases) {
  const contract = contractFile.contracts.find(
    (c) => c.namespace === row.model_namespace,
  );
  const command = row.command_variant ?? row.constructor_commands[0];
  const result = {
    path: row.path,
    command: String(command),
    namespace: contract.namespace,
    candidate_ids: candidates
      .filter(
        (c) =>
          c.path === row.path &&
          String(c.command_variant ?? c.constructor_commands[0]) ===
            String(command),
      )
      .map((c) => c.id),
    authenticated: !!account?.BDUSS,
  };
  try {
    if (
      !contract.request_fields.length ||
      !contract.response_wrapper_fields.length
    )
      throw Error("Protocol contract incomplete");
    const prepared = packet(contract);
    result.input_fields = prepared.inputs;
    result.omitted_fields = prepared.omitted;
    const boundary = "----TiebaApiReadCoverage";
    const body = Buffer.concat([
      Buffer.from(
        "--" +
          boundary +
          '\r\nContent-Disposition: form-data; name="data"; filename="data"\r\nContent-Type: application/octet-stream\r\n\r\n',
      ),
      prepared.body,
      Buffer.from("\r\n--" + boundary + "--\r\n"),
    ]);
    let raw;
    const transport = await probe(
      "https://tiebac.baidu.com" +
        row.path +
        "?cmd=" +
        command +
        "&format=protobuf",
      {
        body,
        headers: {
          "Content-Type": "multipart/form-data; boundary=" + boundary,
        },
        authenticated: !!account?.BDUSS,
        profile: "minimal-read-contract-probe",
        onBody: (b) => (raw = b),
      },
    );
    result.observed_at_utc = new Date().toISOString();
    result.http_status = transport.http_status ?? null;
    if (transport.redirect_origin) result.redirect_origin = transport.redirect_origin;
    result.response_bytes = transport.response_bytes ?? null;
    result.response_sha256 = transport.response_sha256 ?? null;
    result.elapsed_ms = transport.elapsed_ms;
    if (!raw) {
      result.status = "transport-incomplete";
      result.reason = transport.error ?? transport.classification;
    } else if (transport.http_status >= 300 && transport.http_status < 400) {
      result.status = "redirect-response";
      result.reason = "HTTP redirect instead of expected protobuf; no automatic redirect";
    } else {
      fs.writeFileSync(".local/coverage-" + row.id + "-response.bin", raw);
      const parsed = decode(raw, contract);
      result.error_code = parsed.code;
      if (parsed.code !== "0")
        result.status =
          parsed.code === null
            ? "unrecognized-business-status"
            : "business-error";
      else if (!parsed.data?.length) result.status = "accepted-empty-response";
      else {
        result.recognized_response_fields = shape(parsed.data, contract);
        result.status =
          result.recognized_response_fields > 0
            ? "response-schema-validated"
            : "response-schema-unconfirmed";
      }
    }
  } catch (error) {
    result.status = "not-verified";
    result.reason = error.message;
  }
  output.results.push(result);
  console.log(
    JSON.stringify({
      done: output.results.length,
      total: cases.length,
      path: result.path,
      status: result.status,
      error_code: result.error_code,
    }),
  );
  fs.writeFileSync(
    ".local/broad-read-validation.json",
    JSON.stringify(output, null, 2) + "\n",
  );
  await new Promise((resolve) => setTimeout(resolve, 250));
}
output.finished_at_utc = new Date().toISOString();
output.summary = output.results.reduce((a, r) => {
  a[r.status] = (a[r.status] ?? 0) + 1;
  return a;
}, {});
fs.writeFileSync(
  ".local/broad-read-validation.json",
  JSON.stringify(output, null, 2) + "\n",
);
console.log(JSON.stringify(output.summary));

import {
  MODEL_ALIASES,
  READ_MODEL_NAMES,
  ALL_LEGACY_READ_PATHS as LEGACY_READ_PATHS,
} from "../src/verification-plan.mjs";
import fs from "node:fs";
import crypto from "node:crypto";
const read = (p) =>
  JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
const source = read("evidence/endpoint-candidates.json"),
  protocol = read(".local/all-protocol-models.json"),
  index = read("evidence/request-command-index.json");
if (
  source.artifact.sha256 !== protocol.artifact.sha256 ||
  source.artifact.sha256 !== index.artifact_sha256
)
  throw Error("Artifact identity mismatch");
const modelMap = new Map(protocol.models.map((m) => [m.descriptor, m]));
const members = (descriptor) =>
  (modelMap.get(descriptor)?.fields ?? []).flatMap((f) => {
    const a = f.annotations.find(
      (a) => a.type === "Lcom/squareup/wire/ProtoField;",
    );
    return a
      ? [
          {
            name: f.name,
            tag: a.elements.tag.raw_unsigned,
            datatype: a.elements.type?.name ?? null,
            descriptor: f.type,
            label: a.elements.label?.name ?? null,
            field_index: f.field_index,
          },
        ]
      : [];
  });
const models = new Map();
for (const cls of index.classes) {
  for (const builder of cls.model_builder_types) {
    const match = builder.match(/^tbclient\.([^.]+)\./);
    if (!match) continue;
    const ns = match[1];
    if (!models.has(ns))
      models.set(ns, { namespace: ns, classes: [], commands: [] });
    const m = models.get(ns);
    if (!m.classes.includes(cls.class_name)) m.classes.push(cls.class_name);
    for (const c of cls.constructor_literals)
      if (!m.commands.includes(c.socket_command_literal))
        m.commands.push(c.socket_command_literal);
  }
}
const contracts = [...models.values()].map((m) => {
  const req = `Ltbclient/${m.namespace}/${m.namespace}ReqIdl;`,
    res = `Ltbclient/${m.namespace}/${m.namespace}ResIdl;`;
  const requestFields = members(req),
    responseFields = members(res),
    data = requestFields.find((f) => f.name === "data"),
    responseData = responseFields.find((f) => f.name === "data");
  return {
    ...m,
    request_descriptor: req,
    request_wrapper_fields: requestFields,
    request_data_descriptor: data?.descriptor ?? req,
    request_fields: data ? members(data.descriptor) : requestFields,
    response_descriptor: res,
    response_wrapper_fields: responseFields,
    response_data_fields: responseData ? members(responseData.descriptor) : [],
  };
});
const aliases = MODEL_ALIASES;
// Explicit research allowlist. A family prefix or a verb alone never grants live execution.
const reads = READ_MODEL_NAMES;
const live = read("evidence/live-read-validation.json").results.filter(
  (r) => r.business_success === true,
);
const rows = source.candidates.map((candidate) => {
  const url = new URL(candidate.value, "https://tiebac.baidu.com/"),
    path = url.pathname,
    explicit = /^https?:/.test(candidate.value),
    leaf = path.split("/").at(-1);
  const exact = Object.hasOwn(aliases, path)
    ? aliases[path]
    : contracts.find((c) => c.namespace.toLowerCase() === leaf.toLowerCase())
        ?.namespace;
  const contract = contracts.find((c) => c.namespace === exact);
  const command = url.searchParams.get("cmd");
  let category = "needs-behavior-review",
    status = "needs-request-construction";
  if (path.startsWith("/mo/")) {
    category = "web-route";
    status = "needs-page-or-API-review";
  } else if (path.startsWith("/c/p/")) {
    category = "media-resource";
    status = "needs-media-fixture";
  } else if (contract && reads.has(contract.namespace)) {
    category = "reviewed-read-candidate";
    status = contract.commands.length
      ? "ready-for-minimal-read-probe"
      : "needs-command-resolution";
  } else if (
    path.startsWith("/c/c/") ||
    /(?:^|\/)(?:add|del|delete|set|update|cancel|create|send|publish|commit|buy|pay|placeOrder|activate|finish|complete|logout|login|follow|unfollow|agree|share|upload|submit|switch)/i.test(
      path,
    )
  ) {
    category = "stateful-or-auth-action";
    status = "needs-operation-fixture-and-impact-review";
  } else if (/(?:log|track|inpv|\/pv|feedback|stat)/i.test(path)) {
    category = "telemetry-or-state";
    status = "needs-telemetry-test-environment";
  }
  if (
    LEGACY_READ_PATHS.includes(path) &&
    !["reviewed-read-candidate", "web-route", "media-resource"].includes(
      category,
    ) &&
    !path.startsWith("/c/c/")
  ) {
    category = "reviewed-legacy-read-candidate";
    status = "needs-legacy-read-probe";
  }
  if (
    explicit &&
    !["tieba.baidu.com", "tiebac.baidu.com", "c.tieba.baidu.com"].includes(
      url.hostname,
    )
  ) {
    category = "nonproduction-or-other-origin";
    status = "excluded-origin";
  }
  const verified = live.find(
    (r) =>
      new URL(r.url).pathname === path &&
      (!command || new URL(r.url).searchParams.get("cmd") === command),
  );
  if (verified && category !== "nonproduction-or-other-origin") {
    status = "verified-read";
  }
  return {
    id: crypto
      .createHash("sha256")
      .update(candidate.value)
      .digest("hex")
      .slice(0, 16),
    source_value: candidate.value,
    path,
    explicit_origin: explicit ? url.origin : null,
    command_variant: command,
    source_locations: candidate.locations,
    category,
    status,
    classification_basis:
      category === "reviewed-read-candidate"
        ? "explicit semantic read allowlist plus APK model-name association"
        : "path structure/name inference; not proof of behavior",
    model_namespace: contract?.namespace ?? null,
    model_mapping_confidence: contract
      ? "name/alias association; corroborate with runtime shape"
      : "unresolved",
    constructor_commands: contract?.commands ?? [],
    verified_url: verified && status === "verified-read" ? verified.url : null,
  };
});
const reports = [
  "broad-read-validation.json",
  "legacy-signed-validation.json",
  "legacy-additional-validation.json",
];
const ranks = {
  "verified-read": 6,
  "response-schema-validated": 5,
  "json-data-returned": 4,
  "accepted-empty-response": 3,
  "business-error": 2,
  "not-verified": 1,
  "unrecognized-business-status": 1,
  "non-json-response": 1,
};
for (const row of rows) {
  row.attempts = [];
  for (const file of reports) {
    if (!fs.existsSync("evidence/" + file)) continue;
    const report = read("evidence/" + file);
    for (const result of report.results) {
      const matches =
        file === "broad-read-validation.json"
          ? result.candidate_ids?.includes(row.id)
          : result.path === row.path && !row.command_variant;
      if (!matches) continue;
      row.attempts.push({
        report: file,
        status: result.status,
        error_code: result.error_code ?? null,
        response_sha256: result.response_sha256 ?? null,
      });
      if ((ranks[result.status] ?? 0) > (ranks[row.status] ?? 0))
        row.status = result.status;
    }
  }
  if (row.category === "stateful-or-auth-action" && !row.attempts.length)
    row.status = "not-executed-stateful";
}
const summary = rows.reduce(
  (s, r) => {
    s.categories[r.category] = (s.categories[r.category] ?? 0) + 1;
    s.statuses[r.status] = (s.statuses[r.status] ?? 0) + 1;
    return s;
  },
  { categories: {}, statuses: {} },
);
const report = {
  schema_version: 1,
  artifact: source.artifact,
  total_literal_candidates: rows.length,
  unique_paths: new Set(rows.map((r) => r.path)).size,
  scope:
    "Every literal matching c/<letter>/ or mo/<letter>/ in examined DEX string tables; not every dynamically constructed App operation",
  summary,
  rows,
};
fs.writeFileSync(
  "evidence/api-coverage.json",
  JSON.stringify(report, null, 2) + "\n",
);
fs.writeFileSync(
  "evidence/protocol-contracts.json",
  JSON.stringify(
    {
      artifact: source.artifact,
      method: "Wire field annotations plus direct JADX constructor/model index",
      command_index_coverage: index.coverage,
      contracts,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    candidates: rows.length,
    unique_paths: report.unique_paths,
    contracts: contracts.length,
    ...summary,
  }),
);

import fs from "node:fs";
import crypto from "node:crypto";
import { decodeLcpFrame } from "../src/im-protocol.mjs";
const read = (path) => JSON.parse(fs.readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const artifact = read("evidence/api-coverage.json").artifact;
const phases = [];
const addHttp = (name, results) => phases.push({ name, transport: "https", observations: results.map((x) => ({
  name: x.name, actor: x.actor ?? null, observed_at_utc: x.observed_at_utc ?? x.time ?? null,
  origin: x.origin ?? "https://pim.baidu.com", path: x.path, http_method: x.method ?? "POST",
  http_status: x.http_status ?? null, response_bytes: x.response_bytes ?? null, response_sha256: x.response_sha256 ?? null,
  error_code: x.error_code ?? null, response_field_names: x.response_fields ?? x.response_data_fields ?? x.data_fields ?? [],
  own_identity_matches: x.own_identity_matches ?? null,
})) });
for (const [name, file] of [
  ["initial-identifier-hypotheses", ".local/im-uid-mapping-controls.json"],
  ["fans-group-list", ".local/im-group-list-validation.json"],
  ["read-and-token-preflight", ".local/im-read-preflight-validation.json"],
  ["business-http-send-diagnostic", ".local/im-http-message-cycle.json"],
  ["controlled-sdk-group-lifecycle", ".local/im-owned-group-cycle.json"],
  ["verified-own-uk-mapping", ".local/im-actual-uid-mapping-validation.json"],
]) addHttp(name, read(file).results);
const lcp = [];
for (const [phase, file] of [
  ["single-account-login", ".local/im-lcp-login-preflight.json"],
  ["pair-initial", ".local/im-pair-session-validation.json"],
  ["pair-heartbeat-and-cycles", ".local/im-pair-session-validation-2.json"],
]) {
  const report = read(file);
  const http = report.results.filter((x) => x.path);
  if (http.length) addHttp(phase + "-bootstrap", http);
  for (const capture of report.results.filter((x) => x.capture)) {
    const packet = fs.readFileSync(capture.capture);
    if (hash(packet) !== capture.response_sha256) throw Error("LCP capture digest mismatch");
    const frame = decodeLcpFrame(packet);
    lcp.push({ phase, actor: capture.actor ?? null, observed_at_utc: capture.observed_at_utc,
      transport: "tls", origin: "tls://common.lcs.baidu.com:443", response_sha256: hash(packet), response_bytes: packet.length,
      service_id: frame.service_id, method_id: frame.method_id, kind: frame.kind,
      rpc_error_code: frame.rpc_error_code, business_error_code: frame.error_code ?? frame.lcm_response?.error_code ?? null,
      status: frame.status ?? null, json_field_names: frame.json && typeof frame.json === "object" ? Object.keys(frame.json) : [],
    });
  }
}
const cliFiles = [
  ".local/im-login-3a268cab-6459-4614-a888-f7ccf7a0e50f-report.json",
  ".local/im-login-a885a6a5-7575-48bf-b9ca-55e373b9b048-report.json",
];
const cli = cliFiles.map((path, index) => {
  const x = read(path);
  if (!x.own_identity_matches || !x.tls_verified || x.im_error_code !== "0" || x.failure) throw Error("Public CLI verification did not pass");
  return { actor: index + 1, started_at_utc: x.started_at_utc, finished_at_utc: x.finished_at_utc,
    tls_verified: true, own_identity_matches: true, im_error_code: x.im_error_code,
    bootstrap: x.bootstrap, payload_observations: x.responses };
});
const objects = read(".local/im-message-object-checks.json");
if (!objects.pass || objects.checks.length !== 6) throw Error("Message object checks incomplete");
const group = read(".local/im-owned-group-cycle.json");
if (!group.controlled_members_verified || !group.both_accounts_quit_acknowledged) throw Error("Group membership cleanup incomplete");
const pair = read(".local/im-pair-session-validation-2.json");
if (!pair.finished_at_utc) throw Error("IM test session still running");
const privateIds = new Set([
  read(".local/im-pair-private-sender1-response.json").msgid,
  read(".local/im-pair-private-sender2-response.json").msgid,
  read(".local/im-rpc-private-fresh-recall-sample.json").msgid,
].map(String));
const groupIds = new Set([1, 2].map((n) => String(read(".local/im-pair-group-sender" + n + "-response.json").msgid)));
const cleanup = [];
for (const kind of ["private", "group"]) for (const actor of [1, 2]) {
  const file = kind === "private" ? ".local/im-rpc-after-delete-private-account" + actor + ".json" : ".local/im-rpc-group-final-content-account" + actor + ".json";
  const data = read(file), ids = kind === "private" ? privateIds : groupIds;
  const messages = data.messages;
  if (data.err_code !== 0 || !Array.isArray(messages)) throw Error("Cleanup response structure invalid");
  const originalIdsReturned = messages.filter((m) => ids.has(String(m.msgid))).length;
  const markerReturned = JSON.stringify(data).includes(pair.marker);
  if (originalIdsReturned || markerReturned) throw Error("Test message cleanup check failed");
  cleanup.push({ kind, actor, error_code: "0", original_test_ids_returned: originalIdsReturned,
    test_marker_returned: markerReturned, additional_record_count: messages.length,
    additional_record_types: [...new Set(messages.map((m) => m.type))],
    additional_record_origin: messages.length ? "Unconfirmed; retained because they are not the explicitly owned test-message IDs" : null,
  });
}
const lastInfo = read(".local/im-live-controlled-final-group-info.bin").response_params?.group_info?.[0];
const lastMembers = group.results.filter((x) => /^controlled-final-members-account[12]$/.test(x.name));
if (!lastInfo || lastInfo.group_num !== 0 || lastMembers.length !== 2 || lastMembers.some((x) => x.error_code !== "52001"))
  throw Error("Final group state not verified");
const follow = read(".local/main-thread-cycle-followup.json").operations.slice(-2);
addHttp("prior-main-thread-cleanup-followup", follow.map((x) => ({ ...x, origin: "https://tiebac.baidu.com", method: "POST" })));
for (const phase of phases) for (const observation of phase.observations) {
  // Historical helpers sometimes inspected only response_params; recover status from frozen raw captures without another request.
  if (observation.path === "/rest/2.0/im/groupchatv1" && observation.error_code === null) {
    const body = read(".local/im-live-" + observation.name + ".bin");
    observation.error_code = String(body.error_code ?? body.response_params?.error_code ?? "unknown");
  }
}
const rows = phases.flatMap((p) => p.observations);
const counts = {
  recorded_http_responses: rows.length + cli.length,
  lcp_captured_frames: lcp.length,
  lcp_response_frames: lcp.filter((x) => x.kind === "response").length,
  lcp_notification_frames: lcp.filter((x) => x.kind === "notification").length,
  lcp_heartbeat_responses: lcp.filter((x) => x.service_id === "1" && x.method_id === "3").length,
  public_cli_payload_responses: cli.reduce((n, x) => n + x.payload_observations.length, 0),
};
const report = {
  schema_version: 1, artifact,
  scope: {
    ordinary_im_and_sdk_groups: true, forum_moderation_excluded_by_user: true,
    group_fixture: "Exactly two controlled accounts in one SDK groupchat group; distinct from HTTP bar chatroom_id fixtures",
    logical_test_clients: "Dedicated identifiers; no Android device execution or physical device metadata claimed",
    all_static_candidates_completed: false,
    relation_to_603_candidate_table: "Supplemental SDK REST paths and LCP method IDs are outside the original c/* and mo/* literal inventory; do not transfer success by similar naming",
  },
  counts, phases, lcp_observations: lcp, public_cli_checks: cli,
  verified_objects: objects.checks,
  result: {
    private_bidirectional_send_and_recipient_read: true, group_bidirectional_send_and_recipient_read: true,
    normal_private_messages: 2, fresh_private_recall_sample: 1, group_messages: 2,
    private_fresh_recall_acknowledged: read(".local/im-rpc-private-recall-fresh-own-message.json").err_code === 0,
    both_group_messages_recalled: ["group-recall-nonzero-contact-mode1", "group-recall-remaining-own-sender1"].every((x) => read(".local/im-rpc-" + x + ".json").err_code === 0),
    private_exact_deletions_acknowledged: [1,2].every((x) => read(".local/im-rpc-delete-exact-private-account" + x + ".json").err_code === 0),
    group_exact_delete_error_codes: [1,2].map((x) => String(read(".local/im-rpc-delete-exact-group-account" + x + ".json").err_code)),
    message_cleanup: cleanup,
    both_accounts_quit_acknowledged: true, final_member_queries: ["52001", "52001"],
    final_group_member_count: lastInfo.group_num, final_group_status: lastInfo.status, group_metadata_still_queryable: true,
    group_status_semantics_unconfirmed: true,
    prior_main_thread_detail_error_code: follow[0].error_code,
    prior_main_thread_first_post_still_readable: follow[1].created_post_returned === true,
  },
  restrictions: [
    { operation: "HTTP rest/3.0/im/send_msg", code: "300757", message: "bjh return err:user status is error", interpretation: "Business-channel construction diagnostic; ordinary LCP private-message delivery subsequently passed" },
    { operation: "groupchat add_member", code: "30602", message: "members parameter error", interpretation: "Two tested member identifier formats rejected; no permission or feature-removal inference. Controlled second account subsequently joined successfully using join" },
    { operation: "IM method 57, category 1", code: "607", message: "no authorization!", interpretation: "Both current accounts were rejected for exact group-message deletion; sender recall removed the test message bodies" },
    { operation: "IM method 249, recall_mode 0", code: "5", message: "params error", interpretation: "Parameter diagnostic; recall_mode 1 succeeded on the group and fresh private sample" },
    { operation: "Older private reply recall, recall_mode 1", code: "1", message: "systerm error", interpretation: "Cause unconfirmed; do not label a timeout or account restriction. Fresh own private recall later passed" },
  ],
  limitations: [
    "Server-side recipient history read-back verifies delivery; no Android UI or notification display was exercised.",
    "Notification frames were recorded, but unsolicited real-time push acknowledgement and UI rendering were not accepted as completed.",
    "One extra type=22 record with src content remained in each private read-back, without the test marker or original test IDs; origin was not confirmed and it was retained.",
    "The empty group metadata remains queryable (member count 0, status changed from 0 to 1); physical erasure and the exact status meaning were not verified.",
    "The prior main-thread first post remains anonymously readable even though thread detail returns 4.",
    "Original 603-path coverage counts remain separate; this report does not prove other chatroom, payment, account-data or telemetry operations.",
  ],
};
fs.writeFileSync("evidence/im-validation.json", JSON.stringify(report, null, 2) + "\n");
const selected = [
  "im-tieba-sdk-init", "im-tieba-login-account-binding", "im-service-method-routing", "im-sdk-version",
  "im-lcp-token-host", "im-lcp-token-payload", "im-lcp-token-sign", "im-lcp-sign-hash", "im-lcp-wire-envelope",
  "im-lcp-header-fields", "im-lcp-auth-body", "im-lcp-response-meta-parser", "im-login-token-body", "im-login-response-handler",
  "imorigin-params", "im-text-msg-string-constructor", "im-text-content-with-reply-json", "im-message-key-generation", "im-key-byte-order",
  "im-fetch-by-id-body", "im-delete-body", "im-recall-body", "im-recall-param-factory",
  "im-group-create-params", "im-group-host", "im-group-headers", "im-group-info-params", "im-group-member-params", "im-group-quit-params", "im-group-self-join-params",
  "im-get-uid-by-uk-host", "im-get-uid-by-uk-params", "im-get-uid-http-method", "im-get-uid-headers",
];
const sources = selected.map((name) => {
  const record = read(".local/" + name + ".json").structuredContent;
  const normalized = record?.normalized_result;
  if (!record || !normalized?.source?.text) throw Error("Missing complete static source: " + name);
  return { evidence_id: record.evidence_id, operation: record.operation, class_name: normalized.class_name,
    method: normalized.method, representation: normalized.representation, body_status: normalized.body_status,
    source_text_sha256: hash(normalized.source.text), limitations: record.limitations,
  };
});
fs.writeFileSync("evidence/im-protocol-summary.json", JSON.stringify({ schema_version:1, artifact,
  field_tag_extraction: "Direct DEX encoded static FIELD_NUMBER values, with every DEX checked against the artifact inventory; distinct from REA decompilation",
  lcp_field_tags: read(".local/im-lcp-field-tags.json"), sources,
  framing: { magic_hex:"6c637001", prefix_bytes:12, byte_order:"big-endian", size_fields:"total meta+body bytes at offset 4; meta bytes at offset 8", max_frame_bytes:1048576 },
  app_id:10773430, im_sdk_version:11250036, lcp_sdk_version:"3460016",
  lcp_methods: [
    {service:1,method:1,operation:"LCP authentication"}, {service:1,method:3,operation:"LCP heartbeat"},
    {service:2,method:50,operation:"IM account login"}, {service:2,method:55,operation:"Private send"},
    {service:2,method:65,operation:"SDK group send"}, {service:2,method:93,operation:"Read messages by ID interval"},
    {service:2,method:249,operation:"Recall exact own message"}, {service:2,method:57,operation:"Delete exact message IDs in own history"},
  ],
  critical_fields: { status:"IM JSON err_code is independent from the LCP RPC error_code", range:"msgid_begin and msgid_end (values of APK constants), not begin_msgid/end_msgid", recall:"recall_mode=1 passed; mode=0 returned params error", identity:"Use IM login uk for to_user and validate bd_uid against the confirmed account. Profile UK hypotheses were not promoted to identity verification" },
  evidence_boundary:"APK extraction and decompiled code describe construction; functionality is accepted only in the linked im-validation.json observations",
}, null, 2) + "\n");
console.log(JSON.stringify({counts, object_checks:objects.checks.length, test_message_bodies_absent:true, both_accounts_quit:true, group_metadata_retained:true, sources:sources.length}));

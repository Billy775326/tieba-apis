import fs from "node:fs";
import { probe } from "./verify-read-api.mjs";
import {
  bytesField as s,
  intField as i,
  fields,
  first,
} from "../src/protobuf.mjs";
const testForum = process.env.TIEBA_TEST_FORUM?.trim();
if (!testForum || testForum.length > 256) throw Error("Explicit TIEBA_TEST_FORUM is required");
if (!process.argv.includes("--live"))
  throw Error(
    "Explicit --live is required for seven anonymous read/negative-control requests.",
  );
fs.mkdirSync(".local", { recursive: true });
const results = [];
function request(commonTag, parts) {
  const common = Buffer.concat([
    i(1, 2),
    s(2, "22.13.1.1"),
    i(8, Date.now()),
    s(24, "1.0.3"),
  ]);
  return s(1, Buffer.concat([...parts, s(commonTag, common)]));
}
function decode(raw) {
  const root = fields(raw),
    err = first(root, 1),
    data = first(root, 2),
    error = err ? fields(err) : [];
  return {
    error_code: first(error, 1) ?? null,
    error_message: first(error, 2)?.toString("utf8") ?? null,
    data: data ? fields(data) : null,
  };
}
function check(result, checks) {
  result.checks = checks;
  result.business_success =
    result.error_code === "0" &&
    Object.values(checks).every((value) => value === true);
  result.classification = result.business_success
    ? "verified-read"
    : "read-not-verified";
}
async function call(name, path, packet) {
  const options = {};
  let raw;
  options.onBody = (body) => (raw = body);
  if (packet) {
    const boundary = "----TiebaApisReadOnlyValidation";
    options.body = Buffer.concat([
      Buffer.from(
        "--" +
          boundary +
          '\r\nContent-Disposition: form-data; name="data"; filename="data"\r\nContent-Type: application/octet-stream\r\n\r\n',
      ),
      packet,
      Buffer.from("\r\n--" + boundary + "--\r\n"),
    ]);
    options.headers = {
      "Content-Type": "multipart/form-data; boundary=" + boundary,
    };
    options.profile = "minimal-anonymous-protobuf-multipart";
  }
  const result = await probe("https://tiebac.baidu.com/" + path, options);
  let parsed;
  try {
    if (raw) {
      fs.writeFileSync(".local/" + name + "-response.bin", raw);
      parsed = decode(raw);
    }
  } catch (error) {
    result.decode_error = error.message;
  }
  result.error_code = parsed?.error_code ?? null;
  result.error_message = parsed?.error_message ?? null;
  results.push({ name, ...result });
  return { r: results.at(-1), data: parsed?.data };
}
function requireData(response) {
  if (response.r.error_code !== "0" || !response.data)
    throw Error(
      "Cannot continue from " +
        response.r.name +
        ": no successful protobuf data",
    );
  return response.data;
}
try {
  const negative = await call(
    "frs-empty",
    "c/f/frs/page?cmd=301001&format=protobuf",
  );
  negative.r.expected_rejection =
    negative.r.error_code === "3" && !negative.data;
  const a = await call(
    "frs-page1",
    "c/f/frs/page?cmd=301001&format=protobuf",
    request(39, [s(1, testForum), i(2, 2), i(15, 1)]),
  );
  const data = requireData(a),
    forum = fields(first(data, 2)),
    page = fields(first(data, 4));
  const forumName = first(forum, 2)?.toString("utf8");
  const threads = data.filter((f) => f.tag === 7).map((f) => fields(f.value));
  const tid = threads.map((t) => first(t, 1)).find((id) => id && id !== "0");
  check(a.r, {
    forum_matches: forumName === testForum,
    page_matches: first(page, 3) === "1",
    threads_present: threads.length > 0,
  });
  a.r.item_count = threads.length;
  const b = await call(
    "frs-page2",
    "c/f/frs/page?cmd=301001&format=protobuf",
    request(39, [s(1, testForum), i(2, 2), i(15, 2)]),
  );
  if (b.data) {
    check(b.r, {
      forum_matches:
        first(fields(first(b.data, 2)), 2)?.toString("utf8") === forumName,
      page_matches: first(fields(first(b.data, 4)), 3) === "2",
      threads_present: b.data.some((f) => f.tag === 7),
    });
    b.r.item_count = b.data.filter((f) => f.tag === 7).length;
  }
  if (!tid) throw Error("No public thread identifier found");
  const pb = await call(
    "pb-page",
    "c/f/pb/page?cmd=302001&format=protobuf",
    request(25, [i(4, tid), i(18, 1), i(13, 2)]),
  );
  const pbData = requireData(pb),
    posts = pbData.filter((f) => f.tag === 6).map((f) => fields(f.value));
  const post = posts.find((p) => BigInt(first(p, 13) ?? "0") > 0n) ?? posts[0];
  check(pb.r, {
    thread_matches: first(fields(first(pbData, 8)), 1) === tid,
    posts_present: posts.length > 0,
  });
  pb.r.item_count = posts.length;
  if (post) {
    const floor = await call(
      "pb-floor",
      "c/f/pb/floor?cmd=302002&format=protobuf",
      request(9, [i(1, tid), i(2, first(post, 1)), i(4, 1)]),
    );
    check(floor.r, {
      data_present: !!floor.data,
      parent_post_matches:
        !!floor.data &&
        !!first(floor.data, 3) &&
        first(fields(first(floor.data, 3)), 1) === first(post, 1),
    });
  }
  const search = await call(
    "search-forum",
    "c/f/forum/searchPostForum?cmd=309466&format=protobuf",
    request(1, [s(2, testForum)]),
  );
  check(search.r, {
    exact_forum_matches:
      !!search.data &&
      !!first(search.data, 1) &&
      first(fields(first(search.data, 1)), 2)?.toString("utf8") === forumName,
  });
  const uid = post ? first(post, 19) : null;
  if (uid) {
    const profile = await call(
      "profile",
      "c/u/user/profile?cmd=303012&format=protobuf",
      request(9, [i(1, uid), i(6, 1), i(7, 1)]),
    );
    check(profile.r, {
      requested_user_matches:
        !!profile.data &&
        !!first(profile.data, 1) &&
        first(fields(first(profile.data, 1)), 2) === uid,
    });
  }
} catch (error) {
  results.push({
    name: "workflow",
    classification: "incomplete-workflow",
    error: error.message,
    business_success: null,
  });
}
const report = {
  schema_version: 1,
  observed_at_utc: new Date().toISOString(),
  artifact_sha256:
    "06aa06e4579758e7fd33afe7d1a31a257c8ae6251965f3d8235b68cd965f2be3",
  scope:
    "Anonymous minimal public-read requests, no Cookie, account or device identifier",
  sample_forum: testForum,
  limitations: [
    "A single live sample does not establish long-term availability or logged-in behavior.",
    "The server may return more items than rn; it is not treated as a hard response limit.",
    "Signatures were omitted for these tested anonymous reads; this does not establish requirements for other operations.",
    "Raw responses stay under ignored .local/; only counts, semantic checks and digests are recorded.",
  ],
  results,
};
fs.writeFileSync(
  ".local/verified-reads.json",
  JSON.stringify(report, null, 2) + "\n",
);
for (const r of results) console.log(JSON.stringify(r));
if (
  results.some((r) => r.name !== "frs-empty" && r.business_success !== true) ||
  !results.some((r) => r.name === "profile") ||
  !results.find((r) => r.name === "frs-empty")?.expected_rejection
)
  process.exitCode = 2;

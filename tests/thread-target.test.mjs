import { test } from "node:test";
import assert from "node:assert/strict";
import { parseThreadTarget, encodeThreadField } from "../src/thread-target.mjs";
import { fields } from "../src/protobuf.mjs";
test("accepts the supplied official thread URL and preserves 64-bit identifiers", () => {
  assert.equal(
    parseThreadTarget("https://tieba.baidu.com/p/11185790604?pn=2"),
    "11185790604",
  );
  assert.equal(parseThreadTarget("9007199254740993"), "9007199254740993");
});
test("rejects other hosts, credentials, non-thread paths and invalid identifier ranges", () => {
  for (const input of [
    "https://tieba.baidu.com.evil.test/p/11185790604",
    "https://user:pass@tieba.baidu.com/p/11185790604",
    "https://tieba.baidu.com/f?kw=python",
    "0",
    "9223372036854775808",
  ])
    assert.throws(() => parseThreadTarget(input));
});
test("encodes GetPostList repeated post_id as individual int64 occurrences", () => {
  const b = encodeThreadField(
    { name: "post_id", tag: 4, datatype: "INT64", label: "REPEATED" },
    ["101", "102"],
  );
  assert.equal(b.toString("hex"), "20652066");
  assert.deepEqual(
    fields(b).map((f) => f.value),
    ["101", "102"],
  );
  assert.throws(
    () => encodeThreadField({ name: "kz", tag: 2, datatype: "INT64" }, ["101"]),
    /non-repeated/,
  );
});

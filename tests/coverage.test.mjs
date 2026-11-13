import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { signOrderedPairs, legacyForm } from "../src/legacy-signature.mjs";
import {
  ALL_LEGACY_READ_PATHS,
  READ_MODEL_NAMES,
} from "../src/verification-plan.mjs";
test("legacy signing matches the independently computed MD5 fixture", () => {
  assert.equal(
    signOrderedPairs([
      ["kw", "python"],
      ["pn", "1"],
    ]),
    "9ff7967f7ecca1a17c10bf3acce83cdb",
  );
  assert.notEqual(
    signOrderedPairs([
      ["pn", "1"],
      ["kw", "python"],
    ]),
    "9ff7967f7ecca1a17c10bf3acce83cdb",
  );
  assert.throws(
    () => signOrderedPairs([["sign", "already-signed"]]),
    /already/,
  );
});
test("legacy form signs the same decoded pair sequence it transmits", () => {
  const form = new URLSearchParams(
    legacyForm({ pn: 1, kw: "中文 & test" }).toString(),
  );
  const sign = form.get("sign");
  form.delete("sign");
  assert.equal(sign, signOrderedPairs([...form]));
  assert.equal(form.get("kw"), "中文 & test");
});
test("coverage accounts for every static literal exactly once", () => {
  const source = JSON.parse(
      fs.readFileSync("evidence/endpoint-candidates.json"),
    ),
    coverage = JSON.parse(fs.readFileSync("evidence/api-coverage.json"));
  assert.equal(coverage.rows.length, source.candidates.length);
  assert.equal(
    new Set(coverage.rows.map((r) => r.id)).size,
    coverage.rows.length,
  );
  assert.deepEqual(
    new Set(coverage.rows.map((r) => r.source_value)),
    new Set(source.candidates.map((r) => r.value)),
  );
  assert.equal(
    Object.values(coverage.summary.statuses).reduce((a, b) => a + b, 0),
    coverage.rows.length,
  );
});
test("live read plans exclude observed account deletion, payment and posting operations", () => {
  for (const path of [
    "/c/c/post/add",
    "/c/c/user/follow",
    "/c/s/logout",
    "/c/e/consume/placeOrder",
  ])
    assert(!ALL_LEGACY_READ_PATHS.includes(path));
  for (const name of [
    "DelAllUserData",
    "PlaceOrder",
    "AddPost",
    "AddThread",
    "SetUserBlack",
  ])
    assert(!READ_MODEL_NAMES.has(name));
});

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const scanner = path.resolve("scripts/discover-endpoints.mjs");
function fixture(t, strings) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tieba-dex-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const dexDir = path.join(dir, "dex");
  fs.mkdirSync(dexDir);
  const b = Buffer.alloc(
    112 +
      strings.length * 4 +
      strings.reduce((n, s) => n + Buffer.byteLength(s) + 2, 0),
  );
  b.write("dex\n039\0");
  b.writeUInt32LE(b.length, 32);
  b.writeUInt32LE(0x12345678, 40);
  b.writeUInt32LE(strings.length, 56);
  b.writeUInt32LE(112, 60);
  let offset = 112 + strings.length * 4;
  for (let i = 0; i < strings.length; i++) {
    b.writeUInt32LE(offset, 112 + i * 4);
    b[offset++] = strings[i].length;
    offset += b.write(strings[i], offset);
    b[offset++] = 0;
  }
  const dex = path.join(dexDir, "classes.dex");
  fs.writeFileSync(dex, b);
  const apk = path.join(dir, "fixture.apk");
  fs.writeFileSync(apk, "fixture, not a ZIP");
  const out = path.join(dir, "out.json");
  return {
    dex,
    run: () =>
      spawnSync(process.execPath, [scanner, apk, dexDir, out], {
        encoding: "utf8",
      }),
    report: () => JSON.parse(fs.readFileSync(out, "utf8")),
  };
}
test("retains duplicate source locations and excludes non-path text", (t) => {
  const f = fixture(t, ["c/f/pb/page", "prefix c/f/pb/page", "c/f/pb/page"]);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  const r = f.report();
  assert.equal(r.candidates.length, 1);
  assert.deepEqual(
    r.candidates[0].locations.map((x) => x.string_index),
    [0, 2],
  );
  assert.equal(r.artifact.filename, "fixture.apk");
  assert.match(r.artifact.sha256, /^[0-9a-f]{64}$/);
});
test("rejects truncated DEX rather than reporting a complete empty inventory", (t) => {
  const f = fixture(t, ["c/f/frs/page"]);
  fs.truncateSync(f.dex, 64);
  assert.notEqual(f.run().status, 0);
});
test("reports unknown DEX versions as unsupported", (t) => {
  const f = fixture(t, ["c/f/frs/page"]);
  const b = fs.readFileSync(f.dex);
  b.write("999", 4);
  fs.writeFileSync(f.dex, b);
  assert.match(f.run().stderr, /Unsupported DEX magic/);
});
test("covers mutation, commerce and other previously omitted path families without executing them", (t) => {
  const f = fixture(t, [
    "c/c/user/unfollow",
    "c/e/consume/placeOrder",
    "c/b/commit/pushThread",
    "c/r/friend/listFriend",
    "c/i/msgcenter/uploadPic",
    "c/x/sprite/getGuideInfo",
  ]);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.report().candidates.length, 6);
});

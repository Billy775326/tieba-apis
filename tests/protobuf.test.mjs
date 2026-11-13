import { test } from "node:test";
import assert from "node:assert/strict";
import {
  varint,
  bytesField,
  intField,
  fields,
  first,
} from "../src/protobuf.mjs";
test("matches explicit protobuf bytes for the extracted keyword and page tags", () => {
  assert.equal(bytesField(1, "python").toString("hex"), "0a06707974686f6e");
  assert.equal(intField(15, 2).toString("hex"), "7802");
});
test("preserves identifiers above the JavaScript safe integer range", () => {
  const id = "18446744073709551615";
  assert.equal(first(fields(intField(1, id)), 1), id);
  assert.throws(() => varint(9007199254740992), /decimal string/);
});
test("reads an explicit business error independently from HTTP status", () => {
  const error = Buffer.from("0a09080312056572726f72", "hex");
  const nested = fields(first(fields(error), 1));
  assert.equal(first(nested, 1), "3");
  assert.equal(first(nested, 2).toString("utf8"), "error");
});
test("rejects truncated and overflowing wire input", () => {
  assert.throws(() => fields(Buffer.from("0a0578", "hex")), /truncated/);
  assert.throws(
    () => fields(Buffer.from("08ffffffffffffffffff02", "hex")),
    /overflow/,
  );
  assert.throws(() => fields(Buffer.from("00", "hex")), /invalid tag/);
});

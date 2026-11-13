import crypto from "node:crypto";
// APK NetWork.addSign signs the transmitted pair sequence, before URL encoding.
export function signOrderedPairs(entries) {
  if (entries.some(([key]) => key === "sign"))
    throw Error("Input must not already contain sign");
  return crypto
    .createHash("md5")
    .update(
      entries.map(([key, value]) => key + "=" + String(value)).join("") +
        "tiebaclient!!!",
      "utf8",
    )
    .digest("hex");
}
export function legacyForm(values) {
  const entries = Object.entries(values)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([key, value]) => [key, String(value)])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return Buffer.from(
    new URLSearchParams([
      ...entries,
      ["sign", signOrderedPairs(entries)],
    ]).toString(),
  );
}

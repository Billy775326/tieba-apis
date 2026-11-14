import fs from "node:fs";

const modes = {
  "--socket": ["app-socket-contracts.json", "contracts"],
  "--surface": ["network-surface.json", "candidates"],
  "--wire": ["wire-messages.json", "messages"],
  "--requests": ["wire-request-inventory.json", "requests"],
  "--bindings": ["network-call-index.json", "request_classes"],
  "--calls": ["network-call-index.json", "network_methods"],
};
const argument = process.argv[2] ?? "";
const load = (file) => JSON.parse(fs.readFileSync(
  new URL("../evidence/" + file, import.meta.url), "utf8",
).replace(/^\uFEFF/, ""));

if (modes[argument]) {
  const [file, key] = modes[argument];
  const report = load(file);
  const query = (process.argv[3] ?? "").toLowerCase();
  console.log(JSON.stringify({
    artifact: report.artifact,
    verification: argument === "--socket" ? "Reviewed APK command mappings; live results recorded separately; no network requests" : "Static inventory only; no network requests",
    summary: report.summary,
    query,
    results: query ? report[key].filter((row) =>
      JSON.stringify(row).toLowerCase().includes(query)) : [],
  }, null, 2));
} else {
  const report = load("endpoint-candidates.json");
  const query = argument.toLowerCase();
  console.log(JSON.stringify({
    artifact: report.artifact,
    verification: "static-string only",
    candidates: report.candidates.filter((row) =>
      row.value.toLowerCase().includes(query)),
  }, null, 2));
}

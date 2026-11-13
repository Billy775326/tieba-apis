import fs from "node:fs";
const report = JSON.parse(
  fs.readFileSync(
    new URL("../evidence/endpoint-candidates.json", import.meta.url),
    "utf8",
  ),
);
const query = (process.argv[2] ?? "").toLowerCase();
console.log(
  JSON.stringify(
    {
      artifact: report.artifact,
      verification: "static-string only",
      candidates: report.candidates.filter((c) =>
        c.value.toLowerCase().includes(query),
      ),
    },
    null,
    2,
  ),
);

import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { post as probe } from "../src/http/transport.mjs";
export { probe };

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (!process.argv.includes("--live"))
    throw Error("Explicit --live is required to send diagnostic requests.");
  fs.mkdirSync(".local", { recursive: true });
  const urls = [
    "https://tiebac.baidu.com/c/f/frs/page?cmd=301001&format=protobuf",
    "http://c.tieba.baidu.com/c/f/frs/page?cmd=301001&format=protobuf",
  ];
  const results = [];
  for (const url of urls) {
    const result = await probe(url);
    results.push(result);
    console.log(JSON.stringify(result));
  }
  const report = {
    schema_version: 1,
    observed_at_utc: new Date().toISOString(),
    scope:
      "Two anonymous empty POST diagnostics to the discovered read path; no App request reproduction",
    limitations: [
      "These probes do not verify signatures, request parameters or business success.",
      "No HTTP response means endpoint validity remains unknown, not invalid.",
    ],
    results,
  };
  fs.writeFileSync(
    ".local/read-api-probes.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  if (results.every((r) => !r.http_response_received)) process.exitCode = 2;
}

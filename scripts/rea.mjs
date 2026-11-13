import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(
  root,
  ".local/rea-runtime/node_modules/rea-agents/scripts/rea.mjs",
);
const jar = path.join(root, ".local/jadx-complete.jar");
if (!fs.existsSync(cli))
  throw Error(
    "Install the pinned runtime first: npm.cmd install --prefix .local/rea-runtime --omit=optional --ignore-scripts rea-agents@6.4.0",
  );
if (!fs.existsSync(jar))
  throw Error("Missing verified JADX JAR: .local/jadx-complete.jar");
const hash = crypto.createHash("sha256");
for await (const chunk of fs.createReadStream(jar)) hash.update(chunk);
if (
  hash.digest("hex") !==
  "6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75"
)
  throw Error("JADX JAR SHA-256 mismatch");
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, REA_JADX_MCP_JAR: jar },
});
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? 1;
  if (signal) console.error("REA exited with signal " + signal);
});

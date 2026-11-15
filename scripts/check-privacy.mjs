import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const objectKeys = /^(?:thread_id|post_id|forum_id|user_id|uid|pid|tid|fid|portrait|username|user_name|name_show|bd_uid|uk|cuid|email|phone|mobilephone|forum_name|sample_forum|publish_forum)$/i;
const placeholder = value => /^(?:\[redacted[-\w]*\]|synthetic[-\w]*|example[-\w]*|<[^>]+>)$/i.test(value);

// Diagnostics contain locations and rule names only, never the rejected value.
export function inspectPrivacyFile(file, text, denylist = []) {
  const findings = [];
  const add = (rule, offset = 0) => findings.push({file, rule, line: text.slice(0, offset).split('\n').length});
  if (/(?:^|\/)(?:thread|post|user|account|forum)[-_]\d{8,}/i.test(file)) add('resource-id-in-filename');
  if (/^(?:src|scripts)\//.test(file)) {
    for (const match of text.matchAll(/["']?\b(?:thread|thread_id|tid|kz|user_id|uid|fid|forum_id|pid|post_id)["']?\s*:\s*["']?\d{8,}/g)) add('hardcoded-runtime-target', match.index);
  }
  for (const match of text.matchAll(/https:\/\/tieba\.baidu\.com\/p\/(\d{8,})/g)) {
    // The one declared URL fixture tests parsing offline, without a real target.
    if (file === 'tests/thread-target.test.mjs' && match[1] === '123456789') continue;
    add('live-thread-url', match.index);
  }
  for (const match of text.matchAll(/[A-Za-z]:[\\/]Users[\\/]([^\s\\/'"`<>]+)/g)) {
    if (!/^(?:example|synthetic|USERNAME|USER|YOUR_USER)$/i.test(match[1])) add('personal-home-path', match.index);
  }
  for (const match of text.matchAll(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g)) add('private-key', match.index);
  for (const match of text.matchAll(/["']?\b(?:BDUSS|STOKEN|cookie|authorization|access_token|refresh_token|password)["']?\s*[:=]\s*["']([^"'\r\n]*)["']/gi)) {
    if (match[1].length >= 16 && !placeholder(match[1]) && !/^(?:synthetic|example|test|redacted)[-_: ]/i.test(match[1])) add('literal-credential', match.index);
  }
  if (file.startsWith('evidence/') && file.endsWith('.json')) {
    let value;
    try { value = JSON.parse(text); } catch { add('invalid-evidence-json'); }
    const visit = node => {
      if (!node || typeof node !== 'object') return;
      for (const [key, value] of Object.entries(node)) {
        if (objectKeys.test(key) && (typeof value === 'string' || typeof value === 'number') && String(value) && !placeholder(String(value))) add('evidence-object-identifier');
        visit(value);
      }
    };
    visit(value);
  }
  for (const value of denylist) {
    const offset = text.indexOf(value);
    if (offset >= 0 || file.includes(value)) add('local-denylist-match', Math.max(0, offset));
  }
  return findings;
}

export function checkRepositoryPrivacy({root = process.cwd(), staged = false, denylist = []} = {}) {
  const git = args => execFileSync('git', args, {cwd: root, maxBuffer: 24 * 1024 * 1024});
  const files = git(['ls-files', '--cached', '-z']).toString('utf8').split('\0').filter(Boolean);
  const findings = [];
  for (const file of files) {
    // A tracked .local/.env file must fail even though Git normally ignores it.
    if (file.startsWith('.local/') || file === '.env' || /\.(?:apk|dex|jar|log)$/i.test(file)) {
      findings.push({file, rule:'runtime-artifact-tracked', line:1});
      continue;
    }
    const full = path.resolve(root, file);
    if (!staged && !fs.existsSync(full)) continue; // pending deletion
    const bytes = staged ? git(['show', ':' + file]) : fs.readFileSync(full);
    if (bytes.includes(0)) { findings.push({file, rule:'binary-content-requires-review', line:1}); continue; }
    findings.push(...inspectPrivacyFile(file, bytes.toString('utf8'), denylist));
  }
  return {mode: staged ? 'index' : 'working-tree', files_checked:files.length, findings};
}

function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--staged') || args.length > 1) throw Error('Usage: node scripts/check-privacy.mjs [--staged]');
  const localFile = path.resolve('.local/privacy-denylist.json');
  let denylist = [];
  if (fs.existsSync(localFile)) {
    denylist = JSON.parse(fs.readFileSync(localFile, 'utf8').replace(/^\uFEFF/, ''));
    if (!Array.isArray(denylist) || denylist.some(x => typeof x !== 'string' || x.length < 4)) throw Error('Local privacy denylist must be an array of strings of at least four characters');
  }
  const result = checkRepositoryPrivacy({staged:args.includes('--staged'), denylist});
  console.log(JSON.stringify(result, null, 2));
  if (result.findings.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(); } catch { console.error('Privacy check could not complete; check Git state and local denylist format'); process.exitCode = 1; }
}

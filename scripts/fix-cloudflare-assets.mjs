/**
 * Cloudflare Wrangler/Pages always skips any directory named `node_modules`,
 * including Expo's exported font assets under dist/assets/node_modules/...
 * That makes font URLs fall through to the SPA index.html → OTS decode errors
 * and FontFaceObserver NetworkError (looks like the app "keeps disconnecting").
 *
 * Rename that folder and rewrite references so fonts actually deploy.
 * @see https://github.com/cloudflare/workers-sdk/issues/3615
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const FROM_DIR = path.join(DIST, 'assets', 'node_modules');
const TO_DIR = path.join(DIST, 'assets', 'npm');
const FROM_URL = 'assets/node_modules';
const TO_URL = 'assets/npm';

const TEXT_EXTS = new Set(['.js', '.css', '.html', '.json', '.map', '.txt']);

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

if (!fs.existsSync(DIST)) {
  console.error('[fix-cloudflare-assets] dist/ missing — run expo export first');
  process.exit(1);
}

if (!fs.existsSync(FROM_DIR)) {
  console.log('[fix-cloudflare-assets] no assets/node_modules — nothing to rename');
  process.exit(0);
}

if (fs.existsSync(TO_DIR)) {
  fs.rmSync(TO_DIR, { recursive: true, force: true });
}
fs.renameSync(FROM_DIR, TO_DIR);

let rewritten = 0;
for (const file of walkFiles(DIST)) {
  if (!TEXT_EXTS.has(path.extname(file))) continue;
  const before = fs.readFileSync(file, 'utf8');
  if (!before.includes(FROM_URL)) continue;
  const after = before.split(FROM_URL).join(TO_URL);
  fs.writeFileSync(file, after);
  rewritten += 1;
}

const fontCount = walkFiles(TO_DIR).filter((f) => /\.(ttf|otf|woff2?)$/i.test(f)).length;
console.log(
  `[fix-cloudflare-assets] renamed assets/node_modules → assets/npm (${fontCount} fonts, ${rewritten} files rewritten)`,
);

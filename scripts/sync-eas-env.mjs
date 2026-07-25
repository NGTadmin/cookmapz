/**
 * Push EXPO_PUBLIC_* vars from .env to EAS (production, preview, development).
 * Usage: node scripts/sync-eas-env.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');

if (!existsSync(envPath)) {
  console.error('Missing .env — create it from .env.example first.');
  process.exit(1);
}

const vars = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=');
      if (i < 1) return null;
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
    .filter((entry) => entry && entry[0].startsWith('EXPO_PUBLIC_')),
);

const names = Object.keys(vars);
if (!names.length) {
  console.error('No EXPO_PUBLIC_* variables found in .env');
  process.exit(1);
}

const environments = ['production', 'preview', 'development'];

for (const environment of environments) {
  console.log(`\n=== ${environment} ===`);
  for (const name of names) {
    const value = vars[name];
    const cmd = [
      'eas env:create',
      environment,
      `--name ${name}`,
      `--value ${JSON.stringify(value)}`,
      '--visibility sensitive',
      '--force',
      '--non-interactive',
    ].join(' ');

    try {
      execSync(cmd, { cwd: root, stdio: 'inherit' });
      console.log(`✓ ${name}`);
    } catch (error) {
      console.error(`✗ ${name}:`, error.message ?? error);
      process.exitCode = 1;
    }
  }
}

console.log('\nDone. Re-run EAS production builds so env vars are embedded in the app.');

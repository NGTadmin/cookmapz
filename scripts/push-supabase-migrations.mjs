/**
 * Push local supabase/migrations to the hosted project used by the web app.
 *
 * Requires one of:
 *   SUPABASE_ACCESS_TOKEN  (Dashboard → Account → Access Tokens)
 *   or SUPABASE_DB_PASSWORD (Project Settings → Database)
 *
 * Usage:
 *   node scripts/push-supabase-migrations.mjs
 *   node scripts/push-supabase-migrations.mjs --project-ref btnatjbeslpjaqqxobdk
 */
import { spawnSync } from 'node:child_process';

const DEFAULT_PROJECT_REF = 'btnatjbeslpjaqqxobdk';
const args = process.argv.slice(2);
const refFlag = args.findIndex((a) => a === '--project-ref');
const projectRef =
  (refFlag >= 0 ? args[refFlag + 1] : null) ||
  process.env.SUPABASE_PROJECT_REF ||
  DEFAULT_PROJECT_REF;

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const password = process.env.SUPABASE_DB_PASSWORD?.trim();

if (!token && !password) {
  console.error(`Missing credentials.

Set one of:
  SUPABASE_ACCESS_TOKEN   — https://supabase.com/dashboard/account/tokens
  SUPABASE_DB_PASSWORD    — Project Settings → Database → Database password

Then re-run:
  node scripts/push-supabase-migrations.mjs --project-ref ${projectRef}
`);
  process.exit(1);
}

const pushArgs = ['supabase', 'db', 'push', '--yes', '--project-ref', projectRef];
if (password) pushArgs.push('--password', password);

const env = { ...process.env };
if (token) env.SUPABASE_ACCESS_TOKEN = token;

console.log(`Pushing migrations to project ${projectRef}...`);
const result = spawnSync('npx', pushArgs, { stdio: 'inherit', env, shell: true });
process.exit(result.status ?? 1);

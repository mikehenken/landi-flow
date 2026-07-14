import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const body = fs.readFileSync(
  path.join(root, 'supabase/migrations/0034_citext_to_citext_helper.sql'),
  'utf8'
);

const header = `-- hosted-citext-fix-v2.sql — paste ENTIRE file in Supabase SQL Editor
-- Supersedes hosted-citext-fix.sql / migration 0033.
--
-- Why 0033 failed: execute_mutation_with_outbox has SET search_path = ''.
-- Bare ::citext fails at runtime. search_path=extensions alone misses citext in public (0001).
-- Fix: to_citext() helper + replace all ::citext casts in mutation function.

`;

const stripped = body.replace(
  /^-- task-09m iteration 7:[^\n]*\n(?:--[^\n]*\n)*/,
  ''
);

const verify = `
-- ── Verify (run after apply) ──

-- 1) to_citext helper exists and works
SELECT linear_clone_internal.to_citext('Test-Slug') AS sample;

-- 2) mutation function config (search_path should be empty; casts use to_citext)
SELECT p.proname, p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'linear_clone_internal'
  AND p.proname IN ('execute_mutation_with_outbox', 'to_citext');

-- 3) citext schema location
SELECT n.nspname AS citext_schema
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname = 'citext';
`;

fs.writeFileSync(
  path.join(root, 'scripts/sql/hosted-citext-fix-v2.sql'),
  header + stripped + verify
);
console.log('hosted-citext-fix-v2.sql written');

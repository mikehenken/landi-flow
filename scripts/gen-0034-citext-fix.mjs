import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = fs.readFileSync(
  path.join(root, 'supabase/migrations/0029_task09m_persistence.sql'),
  'utf8'
);

const fnStart = src.indexOf(
  'CREATE OR REPLACE FUNCTION linear_clone_internal.execute_mutation_with_outbox'
);
const fnEnd = src.indexOf(
  'REVOKE ALL ON FUNCTION linear_clone_internal.execute_mutation_with_outbox'
);
let fn = src.slice(fnStart, fnEnd);

fn = fn.replace(
  /\(p_params->>'slug'\)::citext/g,
  "linear_clone_internal.to_citext(p_params->>'slug')"
);
fn = fn.replace(
  /\(p_params->>'domain'\)::citext/g,
  "linear_clone_internal.to_citext(p_params->>'domain')"
);
fn = fn.replace(
  /COALESCE\(\(p_params->>'domain'\)::citext, c\.domain\)/g,
  "COALESCE(linear_clone_internal.to_citext(p_params->>'domain'), c.domain)"
);

const header = `-- task-09m iteration 7: bulletproof citext casts for hosted Supabase.
-- Root cause: execute_mutation_with_outbox uses SET search_path = '' so bare ::citext fails.
-- 0033 (search_path = extensions only) fails when citext lives in public (0001) not extensions.
-- Fix: to_citext() helper resolves citext via public + extensions; main function keeps empty search_path.

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION linear_clone_internal.to_citext(p_value text)
RETURNS citext
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO pg_catalog, public, extensions
AS $$
  SELECT p_value::citext;
$$;

REVOKE ALL ON FUNCTION linear_clone_internal.to_citext(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone_internal.to_citext(text) TO service_role;

`;

const footer = `
REVOKE ALL ON FUNCTION linear_clone_internal.execute_mutation_with_outbox FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone_internal.execute_mutation_with_outbox TO service_role;

NOTIFY pgrst, 'reload schema';
`;

const outPath = path.join(root, 'supabase/migrations/0034_citext_to_citext_helper.sql');
fs.writeFileSync(outPath, header + fn + footer);

const remaining = (fn.match(/::citext/g) ?? []).length;
console.log(`Written ${outPath}; remaining ::citext in function body: ${remaining}`);

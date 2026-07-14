const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..", "..");
const envPath = path.join(root, ".env.local");
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("missing supabase url or service role key in .env.local");
  process.exit(1);
}
(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: "linear_clone" },
  });
  const r = await db.from("workspace_members").select("workspace_id").limit(1);
  if (r.error) {
    console.error("FAIL", r.error.code, r.error.message);
    process.exit(1);
  }
  console.log("OK linear_clone PostgREST", "rows", r.data?.length ?? 0);
})();

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

const base = (env.FLOW_API_URL || "").replace(/\/$/, "");
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = (env.E2E_TEST_EMAIL || "test@example.com").trim();
const password = (env.E2E_TEST_PASSWORD || "TestPassword123!").trim();

if (!base || !supabaseUrl || !anonKey) {
  console.error("missing FLOW_API_URL, NEXT_PUBLIC_SUPABASE_URL, or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    console.error("auth sign-in failed");
    process.exit(1);
  }

  const res = await fetch(`${base}/api/v1/workspaces`, {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
  });
  console.log(`HTTP ${res.status}`);
  if (res.status !== 200) process.exit(1);
})();

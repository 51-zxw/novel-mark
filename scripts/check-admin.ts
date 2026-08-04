import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const envFile = resolve(__dirname, "../.env.local");
  const envContent = await readFile(envFile, "utf-8");
  const env: Record<string, string> = {};
  for (const line of envContent.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from("admin_users")
    .select("id, username, password_hash, last_login, created_at");

  if (error) {
    console.log("查询出错:", error.message);
    return;
  }

  console.log("admin_users 表记录数:", (data || []).length);
  for (const u of data || []) {
    console.log({
      id: u.id,
      username: u.username,
      hashPrefix: String(u.password_hash).slice(0, 20),
      last_login: u.last_login,
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

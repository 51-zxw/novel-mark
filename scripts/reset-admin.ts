import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

async function main() {
  const envFile = resolve(__dirname, "../.env.local");
  const envContent = await readFile(envFile, "utf-8");
  const env: Record<string, string> = {};
  for (const line of envContent.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }

  const username = env.ADMIN_USERNAME || "admin";
  const password = env.ADMIN_PASSWORD || "change-me-please";

  const hash = bcrypt.hashSync(password, 10);

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from("admin_users")
    .upsert(
      { username, password_hash: hash },
      { onConflict: "username" }
    )
    .select("id, username")
    .single();

  if (error) {
    console.log("重置失败:", error.message);
    process.exit(1);
  }

  console.log("✓ 管理员密码已重置");
  console.log("  username:", data.username);
  console.log("  password:", password);
  console.log("  id:", data.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

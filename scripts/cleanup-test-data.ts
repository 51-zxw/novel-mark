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

  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // 删除 browser 测试残留的"测试书"（级联删除其卷/章节）
  const { data, error } = await sb.from("books").delete().ilike("title", "测试书%").select("id, title");
  console.log("已清理测试书:", data, error?.message);

  // 报告当前状态
  const { count: bookCount } = await sb.from("books").select("*", { count: "exact", head: true });
  const { count: chapterCount } = await sb.from("chapters").select("*", { count: "exact", head: true });
  console.log(`当前: books=${bookCount}, chapters=${chapterCount}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

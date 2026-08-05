/**
 * 创建一本「M4测试书」（不含任何章节），用于 M4 批量导入功能验证。
 * 不会触碰其他任何数据。
 *
 * 用法：npx tsx scripts/m4-test-data.ts
 */
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

  // 先查是否已存在同名书，存在则直接返回 id
  const { data: existing } = await sb
    .from("books")
    .select("id, title, created_at")
    .ilike("title", "M4测试书%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log("✓ M4测试书已存在，无需重复创建");
    console.log("  id:", existing.id);
    console.log("  title:", existing.title);
    return;
  }

  const { data, error } = await sb
    .from("books")
    .insert({
      title: "M4测试书",
      author: "测试作者",
      description: "M4 阶段导入功能验证用，可随时删除",
      cover_url: null,
      total_word_count: 0,
      status: "连载中",
    })
    .select("id, title")
    .single();

  if (error) {
    console.error("创建失败:", error.message);
    process.exit(1);
  }

  console.log("✓ M4测试书已创建");
  console.log("  id:", data.id);
  console.log("  title:", data.title);
  console.log("");
  console.log("现在可到后台 /admin/books 找到这本书，点击「章节」进行导入测试。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

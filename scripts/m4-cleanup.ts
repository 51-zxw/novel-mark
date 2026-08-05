/**
 * 清理 M4 测试数据：仅删除 title like 'M4测试书%' 的书籍。
 * 通过 books.id 级联删除其 volumes / chapters / sections（数据库外键 on delete cascade）。
 *
 * ⚠️ 本脚本绝对不会触碰其他任何书籍（如《唐砖》）。
 *    仅按 title LIKE 'M4测试书%' 过滤，逐本删除并打印被删的书名/章节数。
 *
 * 用法：npx tsx scripts/m4-cleanup.ts
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

  // 先列出将要删除的书
  const { data: targets, error: qErr } = await sb
    .from("books")
    .select("id, title, created_at")
    .ilike("title", "M4测试书%");

  if (qErr) {
    console.error("查询失败:", qErr.message);
    process.exit(1);
  }

  if (!targets || targets.length === 0) {
    console.log("✓ 没有 M4测试书 数据需要清理");
    return;
  }

  console.log(`将删除 ${targets.length} 本测试书：`);
  for (const t of targets) {
    // 统计章节数
    const { count } = await sb
      .from("chapters")
      .select("*", { count: "exact", head: true })
      .eq("book_id", t.id);
    console.log(`  - 《${t.title}》  id=${t.id}  章节数=${count ?? 0}`);
  }

  // 逐本删除（按精确 id，绝不批量 delete without where）
  let deleted = 0;
  for (const t of targets) {
    const { error: dErr } = await sb.from("books").delete().eq("id", t.id);
    if (dErr) {
      console.error(`  删除《${t.title}》失败:`, dErr.message);
      continue;
    }
    deleted++;
    console.log(`  ✓ 已删除《${t.title}》`);
  }

  console.log("");
  console.log(`✓ 清理完成，共删除 ${deleted}/${targets.length} 本测试书`);

  // 二次确认：确保没有残留
  const { data: leftover } = await sb
    .from("books")
    .select("id, title")
    .ilike("title", "M4测试书%");
  if (leftover && leftover.length > 0) {
    console.log(`⚠ 仍有 ${leftover.length} 本未删除：`, leftover);
  } else {
    console.log("✓ 无残留");
  }

  // 安全检查：打印其他书的数量，确认未误删
  const { count: otherCount } = await sb
    .from("books")
    .select("*", { count: "exact", head: true })
    .not("title", "ilike", "M4测试书%");
  console.log(`✓ 其他书籍未受影响，当前剩余 ${otherCount ?? 0} 本`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

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

  // 各表总数
  const counts = {} as Record<string, number>;
  for (const t of ["books", "volumes", "chapters", "sections"]) {
    const { count } = await sb.from(t).select("*", { count: "exact", head: true });
    counts[t] = count || 0;
  }

  // 进度明细
  const { data: book } = await sb
    .from("books")
    .select("id, title, total_word_count")
    .ilike("title", "唐砖")
    .maybeSingle();

  let volumesCompleted = 0;
  let chaptersInDB = 0;
  if (book) {
    const { data: vols } = await sb
      .from("volumes")
      .select("id, title, order")
      .eq("book_id", book.id)
      .order("order", { ascending: true });
    const volumes = vols || [];
    volumesCompleted = volumes.length;

    // 每卷章节数
    for (const v of volumes.slice(-5)) {
      const { count } = await sb.from("chapters").select("*", { count: "exact", head: true }).eq("volume_id", v.id);
      chaptersInDB += count || 0;
    }
    // 总章节
    const { count: totalCh } = await sb.from("chapters").select("*", { count: "exact", head: true }).eq("book_id", book.id);
    chaptersInDB = totalCh || 0;

    const lastVolumes = volumes.slice(-3).map((v) => v.title);
    console.log(`书籍: ${book.title}  (${book.id})`);
    console.log(`  字数: ${book.total_word_count.toLocaleString()}`);
    console.log(`  卷数: ${volumesCompleted} 已入库`);
    console.log(`  最近完成的卷: ${lastVolumes.join(" → ")}`);
    console.log(`  章节: ${chaptersInDB}/1434  (${(chaptersInDB / 14.34).toFixed(1)}%)`);
  }

  console.log("");
  console.log("数据库各表总行数:");
  console.log(`  books:    ${counts.books}`);
  console.log(`  volumes:  ${counts.volumes}  / 目标 24`);
  console.log(`  chapters: ${counts.chapters}  / 目标 1434`);
  console.log(`  sections: ${counts.sections}  / 目标 1434`);
  console.log(`  完成度:   ${((counts.chapters / 1434) * 100).toFixed(1)}%`);
}

main().catch((e) => { console.error(e); process.exit(1); });

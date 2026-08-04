import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("用法: pnpm tsx scripts/upload-cover.ts <图片路径>");
    console.log("示例: pnpm tsx scripts/upload-cover.ts ./docs/tangzhuan-cover.jpg");
    process.exit(1);
  }

  const imagePath = resolve(args[0]);
  
  try {
    await stat(imagePath);
  } catch {
    console.error(`文件不存在: ${imagePath}`);
    process.exit(1);
  }

  const envFile = resolve(__dirname, "../.env.local");
  const envContent = await readFile(envFile, "utf-8");
  const envVars: Record<string, string> = {};
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    envVars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }

  const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL,
    envVars.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const bookId = "04926af5-dd7f-4f12-b86d-6bf6542ceed9";
  const fileName = `tangzhuan-cover-${Date.now()}.jpg`;

  // 1. 读取图片文件
  const fileBuffer = await readFile(imagePath);

  // 2. 上传到 Supabase Storage
  console.log("📤 上传封面到 Supabase Storage...");
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("book-covers")
    .upload(fileName, fileBuffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    console.error("上传失败:", uploadError.message);
    process.exit(1);
  }

  console.log("✅ 上传成功:", uploadData.path);

  // 3. 获取公开 URL
  const { data: urlData } = supabase.storage
    .from("book-covers")
    .getPublicUrl(fileName);

  const publicUrl = urlData.publicUrl;
  console.log("🔗 公开 URL:", publicUrl);

  // 4. 更新 books 表的 cover_url
  console.log("📝 更新书籍封面...");
  const { data: updateData, error: updateError } = await supabase
    .from("books")
    .update({ cover_url: publicUrl })
    .eq("id", bookId)
    .select("id, title, cover_url");

  if (updateError) {
    console.error("更新失败:", updateError.message);
    process.exit(1);
  }

  console.log("✅ 封面更新成功!");
  console.log("   书籍:", updateData?.[0]?.title);
  console.log("   封面URL:", updateData?.[0]?.cover_url);
}

main().catch((err) => {
  console.error("执行失败:", err);
  process.exit(1);
});
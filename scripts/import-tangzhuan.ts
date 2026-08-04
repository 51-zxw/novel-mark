// 导入小说《唐砖》到数据库
// 用法: pnpm tsx scripts/import-novel.ts
// 频率限制: 每批之间有延迟，避免被 Supabase 限流

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 中文数字转阿拉伯数字
const cnNums: Record<string, number> = {
  零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
  百: 100, 千: 1000,
};

function cnToNum(cn: string): number {
  if (!cn) return 0;
  if (/^\d+$/.test(cn)) return parseInt(cn, 10);
  let result = 0;
  let current = 0;
  for (const ch of cn) {
    const v = cnNums[ch];
    if (v === undefined) continue;
    if (v >= 10) {
      current = (current || 1) * v;
      result += current;
      current = 0;
    } else {
      current = v;
    }
  }
  return result + current;
}

// 解析小说文件
type ParsedSection = {
  order: number;
  title: string;
  content: string;
  wordCount: number;
};

type ParsedVolume = {
  order: number;
  title: string;
  sections: ParsedSection[];
};

function parseNovel(text: string): {
  bookTitle: string;
  author: string;
  volumes: ParsedVolume[];
} {
  const lines = text.split(/\r?\n/);

  // 书名和作者在第一行: 《唐砖》 孑与2 著
  let bookTitle = "未知";
  let author = "未知";
  const firstLine = lines.find((l) => l.trim());
  if (firstLine) {
    const titleMatch = firstLine.match(/《(.+?)》/);
    const authorMatch = firstLine.match(/》\s*(.+?)\s*著/);
    if (titleMatch) bookTitle = titleMatch[1];
    if (authorMatch) author = authorMatch[1];
  }

  // 跳过前言部分，从第一个"第X卷"开始
  const volumes: ParsedVolume[] = [];
  let currentVolume: ParsedVolume | null = null;
  let currentSection: ParsedSection | null = null;
  let contentLines: string[] = [];

  const volumeRegex = /^第([\u4e00-\u9fff]+)卷[\s\u3000]*(.*)/;
  const sectionRegex = /^第([\u4e00-\u9fff]+)节[\s\u3000]*(.*)/;

  const flushContent = () => {
    if (currentSection) {
      const raw = contentLines.join("\n").trim();
      // 清理段落：统一缩进为两空格
      const cleaned = raw
        .split(/\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((p) => "　　" + p)
        .join("\n\n");
      currentSection.content = cleaned;
      currentSection.wordCount = cleaned.replace(/\s/g, "").length;
    }
  };

  for (const line of lines) {
    const volMatch = line.match(volumeRegex);
    const secMatch = line.match(sectionRegex);

    if (volMatch) {
      // 保存上一个节
      flushContent();
      contentLines = [];
      currentSection = null;

      const volOrder = cnToNum(volMatch[1]);
      const volTitle = volMatch[2].trim() || `第${volMatch[1]}卷`;
      currentVolume = {
        order: volOrder,
        title: volTitle,
        sections: [],
      };
      volumes.push(currentVolume);
      console.log(`  发现第${volMatch[1]}卷: ${volTitle}`);
      continue;
    }

    if (secMatch && currentVolume) {
      // 保存上一个节
      flushContent();
      contentLines = [];

      const secOrder = cnToNum(secMatch[1]);
      const secTitle = secMatch[2].trim() || `第${secMatch[1]}节`;
      currentSection = {
        order: secOrder,
        title: secTitle,
        content: "",
        wordCount: 0,
      };
      currentVolume.sections.push(currentSection);
      continue;
    }

    if (currentSection) {
      contentLines.push(line);
    }
  }

  // 保存最后一个节
  flushContent();

  return { bookTitle, author, volumes };
}

// 延迟
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// 主流程
async function main() {
  // 读取 .env.local
  const envFile = resolve(__dirname, "../.env.local");
  const envContent = await readFile(envFile, "utf-8");
  const envVars: Record<string, string> = {};
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    envVars[key] = value;
  }

  const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("缺少 Supabase 环境变量");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const filePath = resolve(__dirname, "../docs/唐砖.txt");
  console.log(`读取文件: ${filePath}`);
  const text = await readFile(filePath, "utf-8");

  console.log("解析小说结构...");
  const { bookTitle, author, volumes } = parseNovel(text);

  const totalSections = volumes.reduce((s, v) => s + v.sections.length, 0);
  const totalWords = volumes.reduce(
    (s, v) => s + v.sections.reduce((ss, sec) => ss + sec.wordCount, 0),
    0
  );
  console.log(`书名: ${bookTitle}`);
  console.log(`作者: ${author}`);
  console.log(`共 ${volumes.length} 卷, ${totalSections} 节, ${totalWords.toLocaleString()} 字`);

  // 确认
  console.log("\n确认导入? (y/N)");
  // 不等待确认，直接导入
  console.log("开始导入...\n");

  // 1. 插入书籍
  console.log("📚 插入书籍...");
  const { data: bookData, error: bookError } = await supabase
    .from("books")
    .insert({
      title: bookTitle,
      author,
      description:
        "《唐砖》是孑与2创作的历史穿越类小说，讲述了现代青年云烨穿越到贞观二年，在大唐盛世中生存发展的故事。",
      cover_url: `https://api.book.colafun.com/books/Xian-De-Wan-Xiao/images/cover.jpg`,
      total_word_count: totalWords,
      status: "completed",
    })
    .select("id")
    .single();

  if (bookError) {
    console.error("插入书籍失败:", bookError.message);
    process.exit(1);
  }
  const bookId = bookData!.id;
  console.log(`  书籍 ID: ${bookId}`);
  await sleep(500);

  // 2. 逐卷插入
  for (const volume of volumes) {
    console.log(`\n📖 插入第${volume.order}卷: ${volume.title} (${volume.sections.length}节)`);

    const { data: volData, error: volError } = await supabase
      .from("volumes")
      .insert({
        book_id: bookId,
        title: volume.title,
        order: volume.order,
      })
      .select("id")
      .single();

    if (volError) {
      console.error(`  插入卷失败:`, volError.message);
      continue;
    }
    const volumeId = volData!.id;

    // 3. 逐节插入（每节之间延迟 150ms，避免限流）
    for (let i = 0; i < volume.sections.length; i++) {
      const section = volume.sections[i];

      const { data: chData, error: chError } = await supabase
        .from("chapters")
        .insert({
          book_id: bookId,
          volume_id: volumeId,
          title: section.title,
          order: section.order,
          word_count: section.wordCount,
        })
        .select("id")
        .single();

      if (chError) {
        console.error(`  插入章节 "${section.title}" 失败:`, chError.message);
        continue;
      }
      const chapterId = chData!.id;

      // 插入正文
      const { error: secError } = await supabase.from("sections").insert({
        chapter_id: chapterId,
        content: section.content,
      });

      if (secError) {
        console.error(`  插入正文失败:`, secError.message);
        continue;
      }

      if ((i + 1) % 10 === 0) {
        console.log(`  已插入 ${i + 1}/${volume.sections.length} 节`);
      }

      // 频率限制：每节 150ms
      await sleep(150);
    }

    // 每卷结束后额外等 500ms
    await sleep(500);
  }

  console.log(`\n✅ 导入完成！`);
  console.log(`   书籍: ${bookTitle} (${bookId})`);
  console.log(`   卷数: ${volumes.length}`);
  console.log(`   章节: ${totalSections}`);
  console.log(`   字数: ${totalWords.toLocaleString()}`);
}

main().catch((err) => {
  console.error("导入失败:", err);
  process.exit(1);
});

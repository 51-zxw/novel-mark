/**
 * 处理《盗墓笔记》txt文件：
 * 1. 去掉 "数字. " 前缀（如 "1. "、"2. "）
 * 2. 去掉 "第一季"、"第二季"
 * 3. 重新组织为9卷：《七星鲁王》《怒海潜沙》《秦岭神树》《云顶天宫》《蛇沼鬼城》《谜海归巢》《阴山古楼》《邛笼石影》《大结局》《贺岁篇》
 * 4. 节号规范化：去掉前置0（如 001 → 1），保持 "第x节" 格式
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT = resolve(__dirname, "../docs/盗墓笔记.txt");
const OUTPUT = resolve(__dirname, "../docs/盗墓笔记_clean.txt");

// 卷名映射表：把文件中的原始卷名映射到目标卷名
// 注意："第二季 楔" 映射到贺岁篇卷，作为该卷开头部分
const volumeMap: Record<string, string> = {
  "第一卷 七星鲁王": "七星鲁王",
  "第二卷 怒海潜沙": "怒海潜沙",
  "第三卷 秦岭神树": "秦岭神树",
  "第四卷 云顶天宫": "云顶天宫",
  "第五卷 云顶天宫": "云顶天宫",
  "第六卷 蛇沼鬼城": "蛇沼鬼城",
  "第七卷 蛇沼鬼城(中)": "蛇沼鬼城",
  "第八卷 蛇沼鬼城": "蛇沼鬼城",
  "第九卷 谜海归巢": "谜海归巢",
  "第一卷 阴山古楼": "阴山古楼",
  "第二卷 邛笼石影": "邛笼石影",
  "第三卷 大结局": "大结局",
  "第四卷 大结局": "大结局",
  "第五卷 贺岁篇": "贺岁篇",
  "楔": "贺岁篇", // 第二季 楔 → 贺岁篇卷开头
};

// 9卷的正确顺序
const VOLUME_ORDER = [
  "七星鲁王",
  "怒海潜沙",
  "秦岭神树",
  "云顶天宫",
  "蛇沼鬼城",
  "谜海归巢",
  "阴山古楼",
  "邛笼石影",
  "大结局",
  "贺岁篇",
];

// 中文数字转阿拉伯数字（保留备用）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function cnToNum(cn: string): number {
  const map: Record<string, number> = {
    "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
    "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
  };
  if (map[cn]) return map[cn];
  if (cn.startsWith("十")) {
    const rest = cn.slice(1);
    return 10 + (map[rest] || 0);
  }
  if (cn.endsWith("十")) {
    const first = cn.slice(0, -1);
    return (map[first] || 1) * 10;
  }
  if (cn.includes("十")) {
    const [first, rest] = cn.split("十");
    return (map[first] || 1) * 10 + (map[rest] || 0);
  }
  return 0;
}

/**
 * 内容规范化：
 * 1. 去掉 "（《盗墓笔记》第x季完）" 这类标记行
 * 2. 按行拆分，识别段落（以 "　　" 或有内容的行作为段落起点）
 * 3. 对没有 "　　" 缩进的段落补上缩进
 * 4. 段落之间统一用空行分隔（即使原文紧贴）
 */
function normalizeContent(content: string): string {
  const rawLines = content.split("\n");
  const paragraphs: string[] = [];

  for (const raw of rawLines) {
    const line = raw.trim();
    if (line === "") continue;

    // 跳过 "（《盗墓笔记》第x季完）" 这类标记
    if (/^（?《盗墓笔记》第[一二三四五六七八九十]+季完）?$/.test(line)) continue;

    // 已经有 "　　" 缩进，保留
    if (line.startsWith("　　")) {
      paragraphs.push(line);
    } else {
      // 没有缩进，补上
      paragraphs.push("　　" + line);
    }
  }

  // 段落之间用空行分隔
  return paragraphs.join("\n\n");
}

async function main() {
  console.log("📖 读取源文件...");
  let raw = await readFile(INPUT, "utf-8");

  // 去掉 BOM 字符
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }

  // 按行分割
  const lines = raw.split("\n");

  // 解析所有章节
  interface Section {
    originalLine: number;
    rawVolume: string;
    targetVolume: string;
    sectionNo: number;
    title: string;
    content: string;
  }

  const sections: Section[] = [];
  let current: Section | null = null;
  let pendingVolume: { rawVolume: string; targetVolume: string } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 去掉 "数字. " 前缀行（如 "1."、"23."）
    if (/^\d+\.\s*$/.test(trimmed)) {
      continue;
    }
    // 去掉异常行：以数字开头且不含任何中文字符的行（如 "5abc"、"123"）
    // 保留以数字开头的中文正文（如 "50年前"、"2010年"）
    if (/^\d+/.test(trimmed) && !/[\u4e00-\u9fa5]/.test(trimmed) && !/第/.test(trimmed)) {
      continue;
    }

    // 尝试匹配完整章节标题：第x卷 xxx 第yyy节 标题（一行完成）
    // 支持：第一季 第x卷 xxx 第yyy节 标题 或 第x卷 xxx 第yyy节 标题
    const fullMatch = trimmed.match(
      /^(第[一二三四五六七八九十]+季\s+)?第([一二三四五六七八九十]+)卷\s+(.+?)\s+第(\d+)节\s+(.+?)$/
    );

    if (fullMatch) {
      // 保存上一节
      if (current) {
        current.content = current.content.trim();
        sections.push(current);
      }

      const rawVolume = `第${fullMatch[2]}卷 ${fullMatch[3].trim()}`;
      const sectionNo = parseInt(fullMatch[4], 10);
      const title = fullMatch[5].trim();
      const targetVolume = volumeMap[rawVolume] || rawVolume;

      current = {
        originalLine: i,
        rawVolume,
        targetVolume,
        sectionNo,
        title,
        content: "",
      };
      pendingVolume = null;
      continue;
    }

    // 匹配 "第二季 楔 第xxx节 标题" 格式（楔子部分）
    const prologueMatch = trimmed.match(
      /^第[一二三四五六七八九十]+季\s+楔\s+第(\d+)节\s+(.+)$/
    );
    if (prologueMatch) {
      if (current) {
        current.content = current.content.trim();
        sections.push(current);
      }
      const sectionNo = parseInt(prologueMatch[1], 10);
      const title = prologueMatch[2].trim();
      current = {
        originalLine: i,
        rawVolume: "楔",
        targetVolume: "贺岁篇",
        sectionNo,
        title,
        content: "",
      };
      pendingVolume = null;
      continue;
    }

    // 尝试匹配卷标题行：第x卷 xxx（单独一行）
    const volumeMatch = trimmed.match(
      /^(第[一二三四五六七八九十]+季\s+)?第([一二三四五六七八九十]+)卷\s+(.+)$/
    );

    if (volumeMatch && !/第\d+节/.test(trimmed)) {
      const rawVolume = `第${volumeMatch[2]}卷 ${volumeMatch[3].trim()}`;
      const targetVolume = volumeMap[rawVolume] || rawVolume;
      pendingVolume = { rawVolume, targetVolume };
      continue;
    }

    // 尝试匹配单独的节标题行：第yyy节 标题
    const sectionMatch = trimmed.match(/^第(\d+)节\s+(.+)$/);

    if (sectionMatch && pendingVolume) {
      // 保存上一节
      if (current) {
        current.content = current.content.trim();
        sections.push(current);
      }

      const sectionNo = parseInt(sectionMatch[1], 10);
      const title = sectionMatch[2].trim();

      current = {
        originalLine: i,
        rawVolume: pendingVolume.rawVolume,
        targetVolume: pendingVolume.targetVolume,
        sectionNo,
        title,
        content: "",
      };
      continue;
    }

    // 累积内容
    if (current) {
      current.content += line + "\n";
    }
  }

  // 保存最后一节
  if (current) {
    current.content = current.content.trim();
    sections.push(current);
  }

  // 内容规范化处理：
  // 1. 每个段落（非空行）如果缺少 "　　" 全角空格缩进，补上
  // 2. 段落之间统一保留一个空行（原始文件有的有空行，有的没有）
  // 3. 去掉孤立的 "（《盗墓笔记》第一季完）" 这类标记行
  for (const s of sections) {
    s.content = normalizeContent(s.content);
  }

  console.log(`✅ 解析完成，共 ${sections.length} 节`);

  // 第二遍：按目标卷分组，并重新编号
  const grouped: Record<string, Section[]> = {};
  for (const vol of VOLUME_ORDER) {
    grouped[vol] = [];
  }
  for (const s of sections) {
    if (!grouped[s.targetVolume]) {
      grouped[s.targetVolume] = [];
    }
    grouped[s.targetVolume].push(s);
  }

  // 每卷内部按原始顺序排序，然后重新编号
  const volumeSections: Record<string, Section[]> = {};
  for (const vol of Object.keys(grouped)) {
    const secs = grouped[vol];
    secs.sort((a, b) => a.originalLine - b.originalLine);
    secs.forEach((s, idx) => {
      s.sectionNo = idx + 1;
    });
    volumeSections[vol] = secs;
  }

  // 第三遍：生成输出
  let output = "";

  for (const vol of VOLUME_ORDER) {
    const secs = volumeSections[vol];
    if (!secs || secs.length === 0) continue;

    const volIdx = VOLUME_ORDER.indexOf(vol) + 1;
    output += `第${volIdx}卷 ${vol}\n\n`;

    for (const sec of secs) {
      output += `第${sec.sectionNo}节 ${sec.title}\n\n`;
      output += sec.content + "\n\n";
    }
  }

  // 处理不在列表中的卷
  let extraIdx = VOLUME_ORDER.length + 1;
  for (const vol of Object.keys(volumeSections)) {
    if (!VOLUME_ORDER.includes(vol) && volumeSections[vol].length > 0) {
      console.log(`⚠️  发现未映射卷：${vol}，共 ${volumeSections[vol].length} 节`);
      output += `第${extraIdx}卷 ${vol}\n\n`;
      for (const sec of volumeSections[vol]) {
        output += `第${sec.sectionNo}节 ${sec.title}\n\n`;
        output += sec.content + "\n\n";
      }
      extraIdx++;
    }
  }

  console.log(`📝 写入输出文件：${OUTPUT}`);
  console.log(`📊 总计：${Object.values(volumeSections).reduce((s, arr) => s + arr.length, 0)} 节`);

  for (const vol of VOLUME_ORDER) {
    const count = volumeSections[vol]?.length || 0;
    if (count > 0) {
      console.log(`   ${vol}: ${count} 节`);
    }
  }

  await writeFile(OUTPUT, output, "utf-8");
  console.log("✅ 处理完成！");
}

main().catch((err) => {
  console.error("❌ 执行失败：", err);
  process.exit(1);
});

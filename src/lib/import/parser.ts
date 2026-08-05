/**
 * TXT 章节解析器
 * 支持「卷-章-节」三层结构，每层格式由用户选择
 */

// 中文数字 → 阿拉伯数字
const CN_NUMS: Record<string, number> = {
  零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
  百: 100, 千: 1000, 万: 10000,
};

function cnToNum(cn: string): number {
  if (!cn) return 0;
  if (/^\d+$/.test(cn)) return parseInt(cn, 10);
  let result = 0;
  let current = 0;
  for (const ch of cn) {
    const v = CN_NUMS[ch];
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

// 预设格式
export const VOLUME_PATTERNS = [
  { label: "第x卷", value: "^第([一二三四五六七八九十百千万零\\d]+)卷" },
  { label: "卷x", value: "^卷([一二三四五六七八九十百千万零\\d]+)" },
  { label: "第x部", value: "^第([一二三四五六七八九十百千万零\\d]+)部" },
  { label: "无卷", value: "" },
] as const;

export const CHAPTER_PATTERNS = [
  { label: "第x章", value: "^第([一二三四五六七八九十百千万零\\d]+)章" },
  { label: "第x回", value: "^第([一二三四五六七八九十百千万零\\d]+)回" },
  { label: "Chapter x", value: "^Chapter\\s+(\\d+)" },
  { label: "无章", value: "" },
] as const;

export const SECTION_PATTERNS = [
  { label: "第x节", value: "^第([一二三四五六七八九十百千万零\\d]+)节" },
  { label: "第x折", value: "^第([一二三四五六七八九十百千万零\\d]+)折" },
  { label: "无节", value: "" },
] as const;

export type ParsedNode = {
  type: "volume" | "chapter" | "section";
  order: number;
  title: string;
  content: string;
  wordCount: number;
  children: ParsedNode[];
};

export type ParseResult = {
  nodes: ParsedNode[];           // 顶层节点（卷 或 章 或 节）
  counts: { volumes: number; chapters: number; sections: number };
  warnings: string[];
};

type LineMatcher = {
  type: "volume" | "chapter" | "section";
  regex: RegExp;
};

/**
 * 主解析函数
 * @param text TXT 全文
 * @param volumePattern  卷正则（空字符串=无卷层）
 * @param chapterPattern 章正则（空字符串=无章层）
 * @param sectionPattern 节正则（空字符串=无节层）
 */
export function parseTxt(
  text: string,
  volumePattern: string,
  chapterPattern: string,
  sectionPattern: string
): ParseResult {
  const warnings: string[] = [];

  // 至少要有一层
  if (!volumePattern && !chapterPattern && !sectionPattern) {
    throw new Error("请至少选择一层标题格式");
  }

  // 构建匹配器（按层级从深到浅：节 > 章 > 卷，因为一行先匹配最具体的）
  const matchers: LineMatcher[] = [];
  if (sectionPattern) matchers.push({ type: "section", regex: new RegExp(sectionPattern) });
  if (chapterPattern) matchers.push({ type: "chapter", regex: new RegExp(chapterPattern) });
  if (volumePattern) matchers.push({ type: "volume", regex: new RegExp(volumePattern) });

  const lines = text.split(/\r?\n/);

  // 统计各层命中数，用于判断「选了但没匹配到」的警告
  let volHits = 0, chHits = 0, secHits = 0;

  // 树根：顶层节点数组
  const roots: ParsedNode[] = [];
  let currentVolume: ParsedNode | null = null;
  let currentChapter: ParsedNode | null = null;
  let currentSection: ParsedNode | null = null;
  let contentLines: string[] = [];

  // 把当前累积的 contentLines 写入 currentSection
  const flushContent = () => {
    if (currentSection) {
      const raw = contentLines.join("\n").trim();
      const cleaned = raw
        .split(/\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((p) => "　　" + p)
        .join("\n\n");
      currentSection.content = cleaned;
      currentSection.wordCount = cleaned.replace(/\s/g, "").length;
    }
    contentLines = [];
  };

  // 默认卷：若用户选了「无卷」但又选了章/节，需要一个隐式卷容器
  // 处理方式：若没有卷层，所有章/节直接作为 roots
  // 若有卷层但文本里没有卷标记，第一个章/节会作为顶层 roots（currentVolume 为 null 时挂到 roots）

  const ensureVolume = (): ParsedNode | null => {
    // 若用户选了卷格式，但当前还没遇到卷标记，章/节暂时挂到 roots 上
    return currentVolume;
  };

  for (const line of lines) {
    // 跳过空行对标题匹配无影响，但内容里要保留空行（flushContent 已处理）
    let matched = false;
    for (const m of matchers) {
      const match = line.match(m.regex);
      if (!match) continue;
      // 命中标题行
      // 先保存上一个 section 的正文
      flushContent();

      const numStr = match[1] || "1";
      const order = cnToNum(numStr);
      // 标题后缀（如「第一章 标题」中的「标题」）
      const restTitle = line.slice(match[0].length).trim();
      const title = restTitle || `第${order}${m.type === "volume" ? "卷" : m.type === "chapter" ? "章" : "节"}`;

      if (m.type === "volume") {
        volHits++;
        currentVolume = { type: "volume", order, title, content: "", wordCount: 0, children: [] };
        roots.push(currentVolume);
        currentChapter = null;
        currentSection = null;
      } else if (m.type === "chapter") {
        chHits++;
        const parent = ensureVolume();
        currentChapter = { type: "chapter", order, title, content: "", wordCount: 0, children: [] };
        if (parent) {
          parent.children.push(currentChapter);
        } else {
          roots.push(currentChapter);
        }
        currentSection = null;
      } else {
        secHits++;
        const parent = currentChapter || ensureVolume();
        currentSection = { type: "section", order, title, content: "", wordCount: 0, children: [] };
        if (parent) {
          parent.children.push(currentSection);
        } else {
          roots.push(currentSection);
        }
      }
      matched = true;
      break;
    }
    if (!matched && (currentSection || currentChapter || currentVolume)) {
      // 内容行（仅当已有至少一个标题时才收集，跳过文件头部的前言）
      contentLines.push(line);
    }
  }
  // 保存最后一个 section 的正文
  flushContent();

  // 统计 + 警告
  if (volumePattern && volHits === 0) warnings.push("选了卷格式但未匹配到任何卷标题，已当作无卷处理");
  if (chapterPattern && chHits === 0) warnings.push("选了章格式但未匹配到任何章标题，已当作无章处理");
  if (sectionPattern && secHits === 0) warnings.push("选了节格式但未匹配到任何节标题，已当作无节处理");

  const counts = {
    volumes: countByType(roots, "volume"),
    chapters: countByType(roots, "chapter"),
    sections: countByType(roots, "section"),
  };

  // 如果什么都没解析到，但文本非空，作为单章全文
  if (roots.length === 0 && text.trim()) {
    const cleaned = text.trim();
    const node: ParsedNode = {
      type: "section",
      order: 1,
      title: "正文",
      content: cleaned,
      wordCount: cleaned.replace(/\s/g, "").length,
      children: [],
    };
    roots.push(node);
    counts.sections = 1;
    warnings.unshift("未匹配到任何标题格式，已将全文作为单章处理");
  }

  return { nodes: roots, counts, warnings };
}

function countByType(roots: ParsedNode[], type: ParsedNode["type"]): number {
  let n = 0;
  const walk = (nodes: ParsedNode[]) => {
    for (const node of nodes) {
      if (node.type === type) n++;
      walk(node.children);
    }
  };
  walk(roots);
  return n;
}

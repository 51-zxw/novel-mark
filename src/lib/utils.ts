export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// 字数统计（中文按字符，英文按单词，简化版：去空白后长度）
export function countWords(text: string): number {
  return text.replace(/\s/g, "").length;
}

// 预计阅读时间（分钟），按 400 字/分钟
export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 400));
}
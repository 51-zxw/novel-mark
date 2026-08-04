import Link from "next/link";
import { readingMinutes } from "@/lib/utils";

/** 轻量级章节类型，仅包含目录展示所需字段 */
export type ChapterLite = {
  id: string;
  title: string;
  order: number;
  word_count: number;
};

export function ChapterItem({
  bookId,
  chapter,
}: {
  bookId: string;
  chapter: ChapterLite;
}) {
  return (
    <Link
      href={`/book/${bookId}/${chapter.id}`}
      className="flex items-center justify-between py-4 hover:bg-[rgba(200,155,8,0.08)] -mx-4 px-4 rounded transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="w-8 text-xs text-[var(--fg-muted)] tabular-nums">
          {String(chapter.order).padStart(3, "0")}
        </span>
        <span className="font-serif text-base">{chapter.title}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-[var(--fg-muted)]">
        <span>{chapter.word_count.toLocaleString()}字</span>
        <span>·</span>
        <span>{readingMinutes(chapter.word_count)}分钟</span>
      </div>
    </Link>
  );
}

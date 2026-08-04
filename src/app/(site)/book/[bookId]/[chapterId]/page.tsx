import { notFound } from "next/navigation";
import {
  fetchBook,
  fetchChapterWithSection,
  fetchVolumes,
  fetchVolumeChapters,
} from "@/lib/supabase/queries";
import { Reader } from "@/components/site/Reader";
import { readingMinutes } from "@/lib/utils";

export const revalidate = 3600;

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ bookId: string; chapterId: string }>;
}) {
  const { bookId, chapterId } = await params;

  // 获取书籍信息 + 当前章节内容
  const [book, result] = await Promise.all([
    fetchBook(bookId),
    fetchChapterWithSection(chapterId),
  ]);

  if (!book) notFound();
  if (!result) notFound();

  const currentChapter = result.chapter;
  const currentVolumeId = currentChapter.volume_id;

  // 只加载当前卷的章节（用于翻页导航），卷列表单独加载
  const [volumes, currentVolumeChapters] = await Promise.all([
    fetchVolumes(bookId),
    currentVolumeId ? fetchVolumeChapters(currentVolumeId) : Promise.resolve([]),
  ]);

  // 在当前卷内查找前后章节
  const volumeIndex = currentVolumeChapters.findIndex(
    (c) => c.id === chapterId
  );
  const prevChapter =
    volumeIndex > 0 ? currentVolumeChapters[volumeIndex - 1] : null;
  const nextChapter =
    volumeIndex < currentVolumeChapters.length - 1
      ? currentVolumeChapters[volumeIndex + 1]
      : null;

  // 侧边栏：只传卷列表（不带章节），章节在用户打开侧边栏时懒加载
  const volumeList = volumes.map((v) => ({
    id: v.id,
    book_id: v.book_id,
    title: v.title,
    order: v.order,
    created_at: v.created_at,
    chapters: [],
  }));

  const content = result.section?.content ?? "";

  return (
    <Reader
      bookId={book.id}
      bookTitle={book.title}
      chapter={result.chapter}
      content={content}
      prevChapter={prevChapter}
      nextChapter={nextChapter}
      readingMinutes={readingMinutes(result.chapter.word_count)}
      volumes={volumeList}
    />
  );
}

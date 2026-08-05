import { notFound } from "next/navigation";
import {
  fetchBook,
  fetchChapterWithSection,
  fetchVolumes,
  fetchVolumeChapters,
} from "@/lib/supabase/queries";
import { Reader } from "@/components/site/Reader";
import { readingMinutes } from "@/lib/utils";
import type { Chapter, VolumeWithChapters } from "@/types/database";

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

  // 获取卷列表
  const volumes = await fetchVolumes(bookId);

  // 查找第一卷（用于首屏预加载章节）
  const firstVolume = volumes.length > 0 ? volumes[0] : null;

  // 并行获取：当前卷章节（翻页导航） + 第一卷章节（侧边栏预加载）
  const [currentVolumeChapters, firstVolumeChapters] = await Promise.all([
    currentVolumeId ? fetchVolumeChapters(currentVolumeId) : Promise.resolve([]),
    firstVolume ? fetchVolumeChapters(firstVolume.id) : Promise.resolve([]),
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

  // 构建初始卷列表：第一卷带章节数据，其余卷不带（懒加载）
  const volumeList: VolumeWithChapters[] = volumes.map((v) => ({
    ...v,
    chapters:
      firstVolume && v.id === firstVolume.id
        ? (firstVolumeChapters as Chapter[])
        : [],
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
      currentChapterOrder={currentChapter.order}
    />
  );
}

import { notFound } from "next/navigation";
import {
  fetchBook,
  fetchChapters,
  fetchChapterWithSection,
  fetchVolumeWithChapters,
} from "@/lib/supabase/queries";
import { Reader } from "@/components/site/Reader";
import { readingMinutes } from "@/lib/utils";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ bookId: string; chapterId: string }>;
}) {
  const { bookId, chapterId } = await params;

  const [book, chapters, result, volumes] = await Promise.all([
    fetchBook(bookId),
    fetchChapters(bookId),
    fetchChapterWithSection(chapterId),
    fetchVolumeWithChapters(bookId),
  ]);

  if (!book) notFound();
  if (!result) notFound();

  // 在当前卷内查找前后章节
  const currentChapter = result.chapter;
  const currentVolumeId = currentChapter.volume_id;
  
  // 获取当前卷的章节列表
  let prevChapter = null;
  let nextChapter = null;
  
  if (currentVolumeId) {
    const currentVolume = volumes.find((v) => v.id === currentVolumeId);
    const volumeChapters = currentVolume?.chapters || [];
    const volumeIndex = volumeChapters.findIndex((c) => c.id === chapterId);
    
    if (volumeIndex > 0) {
      prevChapter = volumeChapters[volumeIndex - 1];
    }
    if (volumeIndex < volumeChapters.length - 1) {
      nextChapter = volumeChapters[volumeIndex + 1];
    }
  } else {
    // 没有卷信息时，使用所有章节
    const currentIndex = chapters.findIndex((c) => c.id === chapterId);
    if (currentIndex > 0) {
      prevChapter = chapters[currentIndex - 1];
    }
    if (currentIndex < chapters.length - 1) {
      nextChapter = chapters[currentIndex + 1];
    }
  }

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
      volumes={volumes}
    />
  );
}

import { supabaseServer } from "./server";
import type { Book, Chapter, Section, Volume, VolumeWithChapters } from "@/types/database";

export async function fetchBooks(): Promise<Book[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Book[]) || [];
}

export async function fetchBook(bookId: string): Promise<Book | null> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .single();
  if (error) throw error;
  return (data as Book) || null;
}

export async function fetchVolumes(bookId: string): Promise<Volume[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("volumes")
    .select("*")
    .eq("book_id", bookId)
    .order("order", { ascending: true });
  if (error) throw error;
  return (data as Volume[]) || [];
}

export async function fetchChapters(bookId: string): Promise<Chapter[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("book_id", bookId)
    .order("order", { ascending: true });
  if (error) throw error;
  return (data as Chapter[]) || [];
}

/** 轻量获取卷列表（不含章节详情，用于目录页快速加载） */
export async function fetchVolumesLight(bookId: string): Promise<(Volume & { chapter_count: number })[]> {
  const supabase = supabaseServer();
  
  // 只获取卷信息和章节数量，不获取章节详情
  const { data: volumes, error: volError } = await supabase
    .from("volumes")
    .select("*")
    .eq("book_id", bookId)
    .order("order", { ascending: true });
  if (volError) throw volError;

  // 统计每个卷的章节数
  const { data: chapters, error: chError } = await supabase
    .from("chapters")
    .select("volume_id")
    .eq("book_id", bookId);
  if (chError) throw chError;

  const countMap = new Map<string, number>();
  for (const ch of chapters || []) {
    const vid = ch.volume_id || "";
    countMap.set(vid, (countMap.get(vid) || 0) + 1);
  }

  return (volumes || []).map((v) => ({
    ...v,
    chapter_count: countMap.get(v.id) || 0,
  }));
}

/** 获取某卷下的章节列表（用于展开卷时懒加载） */
export async function fetchVolumeChapters(volumeId: string): Promise<Chapter[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("chapters")
    .select("id, title, order, word_count")
    .eq("volume_id", volumeId)
    .order("order", { ascending: true });
  if (error) throw error;
  return (data as Chapter[]) || [];
}

/** 获取按卷分组的完整目录数据（用于阅读页侧边栏） */
export async function fetchVolumeWithChapters(bookId: string): Promise<VolumeWithChapters[]> {
  const [volumes, chapters] = await Promise.all([
    fetchVolumes(bookId),
    fetchChapters(bookId),
  ]);

  if (volumes.length === 0) {
    return [{
      id: "",
      book_id: bookId,
      title: "正文",
      order: 0,
      created_at: "",
      chapters: chapters.sort((a, b) => a.order - b.order),
    }];
  }

  const volumeMap = new Map<string, VolumeWithChapters>();
  for (const v of volumes) {
    volumeMap.set(v.id, { ...v, chapters: [] });
  }

  for (const chapter of chapters) {
    const vid = chapter.volume_id;
    if (vid && volumeMap.has(vid)) {
      volumeMap.get(vid)!.chapters.push(chapter);
    } else {
      const firstKey = volumes[0]?.id;
      if (firstKey) {
        volumeMap.get(firstKey)!.chapters.push(chapter);
      }
    }
  }

  // 确保每卷内的章节按 order 排序
  return volumes.map((v) => {
    const vol = volumeMap.get(v.id)!;
    vol.chapters.sort((a, b) => a.order - b.order);
    return vol;
  });
}

export async function fetchChapterWithSection(
  chapterId: string
): Promise<{ chapter: Chapter; section: Section | null } | null> {
  const supabase = supabaseServer();

  const { data: chapterData, error: chapterError } = await supabase
    .from("chapters")
    .select("*")
    .eq("id", chapterId)
    .single();
  if (chapterError) throw chapterError;
  if (!chapterData) return null;

  // 直接查询 sections 表，避免关联查询在重命名后失效
  const { data: sectionData, error: sectionError } = await supabase
    .from("sections")
    .select("*")
    .eq("chapter_id", chapterId)
    .maybeSingle();
  if (sectionError) throw sectionError;

  return {
    chapter: chapterData as Chapter,
    section: (sectionData as Section) || null,
  };
}

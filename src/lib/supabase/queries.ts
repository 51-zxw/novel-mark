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

/** 获取卷列表 + 所有章节（两次并行查询，返回分组后的数据） */
export async function fetchVolumesWithAllChapters(bookId: string): Promise<{
  volumes: Volume[];
  chaptersMap: Map<string, Chapter[]>;
}> {
  const supabase = supabaseServer();
  
  // 并行获取卷列表和所有章节
  const [{ data: volumes, error: volError }, { data: chapters, error: chError }] = await Promise.all([
    supabase
      .from("volumes")
      .select("*")
      .eq("book_id", bookId)
      .order("order", { ascending: true }),
    supabase
      .from("chapters")
      .select("id, title, order, word_count, volume_id")
      .eq("book_id", bookId)
      .order("order", { ascending: true }),
  ]);
  
  if (volError) throw volError;
  if (chError) throw chError;

  // 按 volume_id 分组
  const chaptersMap = new Map<string, Chapter[]>();
  for (const ch of (chapters as Chapter[]) || []) {
    const vid = ch.volume_id || "";
    if (!chaptersMap.has(vid)) {
      chaptersMap.set(vid, []);
    }
    chaptersMap.get(vid)!.push(ch);
  }

  return {
    volumes: (volumes || []) as Volume[],
    chaptersMap,
  };
}

/** 获取某卷下的章节列表 */
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
    .select("id, title, order, word_count, volume_id, book_id, created_at")
    .eq("id", chapterId)
    .single();
  if (chapterError) throw chapterError;
  if (!chapterData) return null;

  const { data: sectionData, error: sectionError } = await supabase
    .from("sections")
    .select("id, chapter_id, content")
    .eq("chapter_id", chapterId)
    .maybeSingle();
  if (sectionError) throw sectionError;

  return {
    chapter: chapterData as Chapter,
    section: (sectionData as unknown as Section) || null,
  };
}

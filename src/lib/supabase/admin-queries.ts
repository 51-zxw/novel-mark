import { supabaseAdmin } from "./admin";
import type { Book, AdminUser, Chapter, Section, Volume, VolumeWithChapters } from "@/types/database";

export async function adminLogin(
  username: string,
  passwordHash: string
): Promise<AdminUser | null> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("username", username)
    .eq("password_hash", passwordHash)
    .single();
  if (error) throw error;
  return (data as AdminUser) || null;
}

export async function adminListBooks(): Promise<Book[]> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Book[]) || [];
}

export async function fetchBookForAdmin(id: string): Promise<Book | null> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return (data as Book) || null;
}

export async function adminCreateBook(book: Partial<Book>): Promise<Book> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("books")
    .insert([book] as never)
    .select()
    .single();
  if (error) throw error;
  return data as Book;
}

export async function adminUpdateBook(
  id: string,
  book: Partial<Book>
): Promise<void> {
  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("books")
    .update(book as never)
    .eq("id", id);
  if (error) throw error;
}

export async function adminDeleteBook(id: string): Promise<void> {
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("books").delete().eq("id", id);
  if (error) throw error;
}

// ============ 章节 CRUD（M4）============

/** 查询某本书的章节列表（含 section 正文） */
export async function adminListChaptersByBook(
  bookId: string
): Promise<Chapter[]> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("book_id", bookId)
    .order("order", { ascending: true });
  if (error) throw error;
  return (data as Chapter[]) || [];
}

/** 获取单章 + 正文 */
export async function adminGetChapterWithSection(
  chapterId: string
): Promise<{ chapter: Chapter | null; section: Section | null }> {
  const supabase = supabaseAdmin();
  const { data: ch, error: chErr } = await supabase
    .from("chapters")
    .select("*")
    .eq("id", chapterId)
    .maybeSingle();
  if (chErr) throw chErr;
  if (!ch) return { chapter: null, section: null };
  const { data: sec, error: secErr } = await supabase
    .from("sections")
    .select("*")
    .eq("chapter_id", chapterId)
    .maybeSingle();
  if (secErr) throw secErr;
  return { chapter: ch as Chapter, section: (sec as Section | null) ?? null };
}

/** 新建单章 + 正文（追加到当前书末尾） */
export async function adminCreateChapter(
  bookId: string,
  volumeId: string | null,
  data: { title: string; content: string }
): Promise<Chapter> {
  const supabase = supabaseAdmin();
  // 查当前最大 order（在该 book + 同 volume 下）
  let maxOrder = 0;
  const query = supabase
    .from("chapters")
    .select("order")
    .eq("book_id", bookId);
  if (volumeId) {
    void query.eq("volume_id", volumeId);
  }
  const { data: maxRow } = await query
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();
  maxOrder = (maxRow as { order?: number } | null)?.order ?? 0;

  const wordCount = data.content.replace(/\s/g, "").length;

  const { data: inserted, error } = await supabase
    .from("chapters")
    .insert([
      {
        book_id: bookId,
        volume_id: volumeId,
        order: maxOrder + 1,
        title: data.title,
        word_count: wordCount,
      },
    ] as never)
    .select()
    .single();
  if (error) throw error;
  const chapter = inserted as Chapter;

  const { error: secErr } = await supabase
    .from("sections")
    .insert([{ chapter_id: chapter.id, content: data.content }] as never);
  if (secErr) throw secErr;

  await refreshBookWordCount(bookId);
  return chapter;
}

/** 更新章节标题 + 正文 + 精校状态 */
export async function adminUpdateChapter(
  chapterId: string,
  bookId: string,
  title: string,
  content: string,
  proofread?: boolean
): Promise<void> {
  const supabase = supabaseAdmin();
  const wordCount = content.replace(/\s/g, "").length;

  const updateData: Record<string, unknown> = { title, word_count: wordCount };
  if (proofread !== undefined) updateData.proofread = proofread;

  const { error: chErr } = await supabase
    .from("chapters")
    .update(updateData as never)
    .eq("id", chapterId);
  if (chErr) throw chErr;

  // sections 表：若存在则 update，否则 insert
  const { data: existing } = await supabase
    .from("sections")
    .select("id")
    .eq("chapter_id", chapterId)
    .maybeSingle();
  if (existing) {
    const { error: secErr } = await supabase
      .from("sections")
      .update({ content, updated_at: new Date().toISOString() } as never)
      .eq("chapter_id", chapterId);
    if (secErr) throw secErr;
  } else {
    const { error: secErr } = await supabase
      .from("sections")
      .insert([{ chapter_id: chapterId, content }] as never);
    if (secErr) throw secErr;
  }

  await refreshBookWordCount(bookId);
}

/** 删除单章（级联删除 sections 通过数据库外键 on delete cascade） */
export async function adminDeleteChapter(
  chapterId: string,
  bookId: string
): Promise<void> {
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("chapters").delete().eq("id", chapterId);
  if (error) throw error;
  await refreshBookWordCount(bookId);
}

/** 重算书籍总字数（查所有 chapter.word_count 求和） */
export async function refreshBookWordCount(bookId: string): Promise<void> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("chapters")
    .select("word_count")
    .eq("book_id", bookId);
  const total = (data ?? []).reduce(
    (sum, c: unknown) => sum + ((c as { word_count?: number }).word_count ?? 0),
    0
  );
  await supabase
    .from("books")
    .update({ total_word_count: total } as never)
    .eq("id", bookId);
}

/** 后台用：一次性查卷 + 章节（service_role），返回 VolumeWithChapters[] */
export async function adminListVolumesWithChapters(
  bookId: string
): Promise<VolumeWithChapters[]> {
  const supabase = supabaseAdmin();
  const [{ data: volumes, error: volErr }, { data: chapters, error: chErr }] =
    await Promise.all([
      supabase
        .from("volumes")
        .select("*")
        .eq("book_id", bookId)
        .order("order", { ascending: true }),
      supabase
        .from("chapters")
        .select("*")
        .eq("book_id", bookId)
        .order("order", { ascending: true }),
    ]);
  if (volErr) throw volErr;
  if (chErr) throw chErr;

  const volList = (volumes || []) as Volume[];
  const chList = (chapters || []) as Chapter[];

  const result: VolumeWithChapters[] = volList.map((v) => ({
    ...v,
    chapters: chList
      .filter((c) => c.volume_id === v.id)
      .sort((a, b) => a.order - b.order),
  }));

  // 没有 volume_id 的章节（如「无卷」模式导入的）挂到一个虚拟卷
  const orphans = chList.filter((c) => !c.volume_id);
  if (orphans.length > 0 && volList.length === 0) {
    result.unshift({
      id: "",
      book_id: bookId,
      title: "默认卷",
      order: 0,
      created_at: "",
      chapters: orphans,
    });
  }

  return result;
}

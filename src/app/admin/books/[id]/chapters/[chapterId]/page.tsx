import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { fetchBookForAdmin, adminGetChapterWithSection, adminUpdateChapter } from "@/lib/supabase/admin-queries";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { EditChapterClient } from "./EditChapterClient";

export default async function EditChapterPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}) {
  const { id: bookId, chapterId } = await params;
  const session = await getSession();
  if (!session) return <div>未登录</div>;

  const [book, { chapter, section }] = await Promise.all([
    fetchBookForAdmin(bookId),
    adminGetChapterWithSection(chapterId),
  ]);
  if (!book) notFound();
  if (!chapter) notFound();

  // 计算该章节在卷内的序号（1-based）
  let chapterIndex = 1;
  if (chapter.volume_id) {
    const supabase = supabaseAdmin();
    const { data: siblings } = await supabase
      .from("chapters")
      .select("id")
      .eq("volume_id", chapter.volume_id)
      .order("order", { ascending: true });
    chapterIndex = (siblings?.findIndex((c: { id: string }) => c.id === chapterId) ?? -1) + 1;
  }

  async function saveChapter(
    chId: string,
    bId: string,
    title: string,
    content: string,
    proofread: boolean
  ) {
    "use server";
    if (!session) throw new Error("未登录");
    await adminUpdateChapter(chId, bId, title, content, proofread);
    revalidatePath(`/admin/books/${bId}/chapters`);
  }

  return (
    <EditChapterClient
      bookId={bookId}
      chapterId={chapterId}
      chapterIndex={chapterIndex}
      initialTitle={chapter.title}
      initialContent={section?.content || ""}
      initialProofread={chapter.proofread ?? false}
      saveAction={saveChapter}
      backHref={`/admin/books/${bookId}/chapters`}
    />
  );
}

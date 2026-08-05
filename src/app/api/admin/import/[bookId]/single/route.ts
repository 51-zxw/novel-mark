import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyToken, TOKEN_KEY } from "@/lib/auth";
import { refreshBookWordCount } from "@/lib/supabase/admin-queries";

export const maxDuration = 30;

/** 单节导入：支持 file + title 或 content + title 两种形式 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_KEY())?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const form = await request.formData();
  const title = (form.get("title") as string) || "";
  const file = form.get("file") as File | null;
  const rawContent = (form.get("content") as string) || "";
  const volumeId = (form.get("volumeId") as string) || null;

  let content = "";
  let finalTitle = title;

  if (file) {
    content = await file.text();
    if (!finalTitle) {
      finalTitle = file.name.replace(/\.txt$/i, "");
    }
  } else if (rawContent) {
    content = rawContent;
  } else {
    return NextResponse.json({ error: "缺少文件或正文内容" }, { status: 400 });
  }

  if (!content.trim()) {
    return NextResponse.json({ error: "内容为空" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  // 格式化正文（与批量导入一致的段落清理）
  const cleaned = content
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => "　　" + p)
    .join("\n\n");
  const wordCount = cleaned.replace(/\s/g, "").length;

  // 计算 order：指定卷时取该卷最大 order，否则取全书最大 order
  const orderQuery = volumeId
    ? supabase
        .from("chapters")
        .select("order")
        .eq("volume_id", volumeId)
        .order("order", { ascending: false })
        .limit(1)
        .maybeSingle()
    : supabase
        .from("chapters")
        .select("order")
        .eq("book_id", bookId)
        .order("order", { ascending: false })
        .limit(1)
        .maybeSingle();
  const { data: maxRow } = await orderQuery;
  const nextOrder = ((maxRow as { order?: number } | null)?.order ?? 0) + 1;

  // 插入章节
  const { data: ch, error } = await supabase
    .from("chapters")
    .insert([
      {
        book_id: bookId,
        volume_id: volumeId,
        order: nextOrder,
        title: finalTitle,
        word_count: wordCount,
      },
    ] as never)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const chapterId = (ch as { id: string }).id;

  const { error: secErr } = await supabase
    .from("sections")
    .insert([{ chapter_id: chapterId, content: cleaned }] as never);
  if (secErr) {
    return NextResponse.json({ error: secErr.message }, { status: 500 });
  }

  await refreshBookWordCount(bookId);

  return NextResponse.json({ ok: true, chapterId, wordCount });
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

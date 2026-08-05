import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyToken, TOKEN_KEY } from "@/lib/auth";
import { parseTxt } from "@/lib/import/parser";
import type { ParsedNode } from "@/lib/import/parser";

export const maxDuration = 60;

/** 递归写入解析树（纯追加） */
async function writeNodes(
  bookId: string,
  nodes: ParsedNode[],
  baseVolumeOrder: number,
  supabase: ReturnType<typeof supabaseAdmin>
): Promise<{ volumes: number; chapters: number; sections: number }> {
  const stats = { volumes: 0, chapters: 0, sections: 0 };
  let volumeOrder = baseVolumeOrder;

  for (const node of nodes) {
    if (node.type === "volume") {
      // 写卷
      const { data: vol, error } = await supabase
        .from("volumes")
        .insert([{ book_id: bookId, title: node.title, order: ++volumeOrder }] as never)
        .select("id")
        .single();
      if (error) throw error;
      stats.volumes++;
      const volumeId = (vol as { id: string }).id;
      // 写子节点（章/节）
      const childStats = await writeChildren(
        bookId,
        volumeId,
        node.children,
        supabase
      );
      stats.chapters += childStats.chapters;
      stats.sections += childStats.sections;
    } else {
      // 顶层是章/节，无卷
      const childStats = await writeChildren(bookId, null, [node], supabase);
      stats.chapters += childStats.chapters;
      stats.sections += childStats.sections;
    }
  }
  return stats;
}

async function writeChildren(
  bookId: string,
  volumeId: string | null,
  children: ParsedNode[],
  supabase: ReturnType<typeof supabaseAdmin>
): Promise<{ chapters: number; sections: number }> {
  const stats = { chapters: 0, sections: 0 };
  let orderInLayer = 0;

  for (const child of children) {
    if (child.type === "chapter") {
      // 章本身不存正文，只作为分组；若它有子节（节），章无 sections
      const { data: ch, error } = await supabase
        .from("chapters")
        .insert([
          {
            book_id: bookId,
            volume_id: volumeId,
            order: ++orderInLayer,
            title: child.title,
            word_count: 0,
          },
        ] as never)
        .select("id")
        .single();
      if (error) throw error;
      stats.chapters++;
      const chapterId = (ch as { id: string }).id;
      // 写子节
      let chapterWordCount = 0;
      for (const sec of child.children) {
        if (sec.type !== "section") continue;
        const { data: secCh, error: secChErr } = await supabase
          .from("chapters")
          .insert([
            {
              book_id: bookId,
              volume_id: volumeId,
              order: ++orderInLayer,
              title: sec.title,
              word_count: sec.wordCount,
            },
          ] as never)
          .select("id")
          .single();
        if (secChErr) throw secChErr;
        stats.sections++;
        const secChapterId = (secCh as { id: string }).id;
        chapterWordCount += sec.wordCount;
        const { error: secErr } = await supabase
          .from("sections")
          .insert([{ chapter_id: secChapterId, content: sec.content }] as never);
        if (secErr) throw secErr;
      }
      // 更新章字数（章下所有节之和）
      if (chapterWordCount > 0) {
        await supabase
          .from("chapters")
          .update({ word_count: chapterWordCount } as never)
          .eq("id", chapterId);
      }
    } else if (child.type === "section") {
      // 直接作为最小单元
      const { data: ch, error } = await supabase
        .from("chapters")
        .insert([
          {
            book_id: bookId,
            volume_id: volumeId,
            order: ++orderInLayer,
            title: child.title,
            word_count: child.wordCount,
          },
        ] as never)
        .select("id")
        .single();
      if (error) throw error;
      stats.sections++;
      const chapterId = (ch as { id: string }).id;
      const { error: secErr } = await supabase
        .from("sections")
        .insert([{ chapter_id: chapterId, content: child.content }] as never);
      if (secErr) throw secErr;
    }
  }
  return stats;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;

  // 鉴权
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_KEY())?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const volumePattern = (form.get("volumePattern") as string) || "";
  const chapterPattern = (form.get("chapterPattern") as string) || "";
  const sectionPattern = (form.get("sectionPattern") as string) || "";

  if (!file) {
    return NextResponse.json({ error: "缺少文件" }, { status: 400 });
  }

  const text = await file.text();
  let parsed;
  try {
    parsed = parseTxt(text, volumePattern, chapterPattern, sectionPattern);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "解析失败" },
      { status: 400 }
    );
  }

  if (parsed.nodes.length === 0) {
    return NextResponse.json({ error: "未能解析出任何章节" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  // 查当前书已有卷的最大 order，作为追加起点
  const { data: maxVol } = await supabase
    .from("volumes")
    .select("order")
    .eq("book_id", bookId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const baseVolumeOrder = (maxVol as { order?: number } | null)?.order ?? 0;

  // 写入（纯追加，不删任何已有数据）
  try {
    const stats = await writeNodes(bookId, parsed.nodes, baseVolumeOrder, supabase);

    // 重算书总字数
    const { data: allChapters } = await supabase
      .from("chapters")
      .select("word_count")
      .eq("book_id", bookId);
    const total = (allChapters ?? []).reduce(
      (sum, c: unknown) =>
        sum + ((c as { word_count?: number }).word_count ?? 0),
      0
    );
    await supabase
      .from("books")
      .update({ total_word_count: total } as never)
      .eq("id", bookId);

    return NextResponse.json({
      ok: true,
      imported: stats,
      warnings: parsed.warnings,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "写入失败" },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

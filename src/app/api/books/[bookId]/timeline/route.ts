import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin)
      return NextResponse.json(
        { code: 401, message: "未登录" },
        { status: 401 },
      );

    const supabase = supabaseServer();
    const { bookId } = await params;

    // 1. 查找「剧情」标签
    const { data: plotLabels, error: labelError } = await supabase
      .from("labels")
      .select("id")
      .eq("book_id", bookId)
      .eq("admin_id", admin.id)
      .ilike("name", "%剧情%");
    if (labelError) throw labelError;
    if (!plotLabels || plotLabels.length === 0)
      return NextResponse.json({ code: 0, data: [], message: "success" });

    const plotLabelIds = plotLabels.map((l) => l.id);

    // 2. 查 annotation_labels 获取 annotation_id
    const { data: links, error: linkError } = await supabase
      .from("annotation_labels")
      .select("annotation_id")
      .in("label_id", plotLabelIds);
    if (linkError) throw linkError;

    const annotationIds = [
      ...new Set((links || []).map((l) => l.annotation_id)),
    ];
    if (annotationIds.length === 0)
      return NextResponse.json({ code: 0, data: [], message: "success" });

    // 3. 查标注详情（显式选出 start_offset 用于跳转）
    const { data, error } = await supabase
      .from("annotations")
      .select(
        `id, selected_text, start_offset, created_at, chapter_id, chapter:chapters(id, order, title), labels:annotation_labels(label:labels(id, name, color))`,
      )
      .eq("book_id", bookId)
      .eq("admin_id", admin.id)
      .in("id", annotationIds)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const result = (data || []).map((item: any) => ({
      id: item.id,
      title: item.selected_text,
      chapter_id: item.chapter_id,
      start_offset: item.start_offset, // ← 关键：返回偏移
      chapter_order: item.chapter?.order || 0,
      chapter_title: item.chapter?.title || "",
      created_at: item.created_at,
      labels: (item.labels || []).map((l: any) => l.label).filter(Boolean),
    }));
    return NextResponse.json({ code: 0, data: result, message: "success" });
  } catch (err: any) {
    return NextResponse.json(
      { code: 500, data: null, message: err.message },
      { status: 500 },
    );
  }
}

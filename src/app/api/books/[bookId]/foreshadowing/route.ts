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

    // 1. 查找「伏笔」标签
    const { data: foreLabels } = await supabase
      .from("labels")
      .select("id")
      .eq("book_id", bookId)
      .eq("admin_id", admin.id)
      .ilike("name", "%伏笔%");

    if (!foreLabels?.length)
      return NextResponse.json({ code: 0, data: [], message: "success" });

    const foreLabelIds = foreLabels.map((l) => l.id);

    // 2. 获取所有带「伏笔」标签的标注 ID
    const { data: foreLinks } = await supabase
      .from("annotation_labels")
      .select("annotation_id")
      .in("label_id", foreLabelIds);

    const foreAnnotationIds = [
      ...new Set((foreLinks || []).map((l) => l.annotation_id)),
    ];
    if (!foreAnnotationIds.length)
      return NextResponse.json({ code: 0, data: [], message: "success" });

    // 3. 获取所有伏笔标注详情
    const { data: allForeAnnotations } = await supabase
      .from("annotations")
      .select(`*, chapter:chapters(order, title)`)
      .in("id", foreAnnotationIds)
      .eq("book_id", bookId)
      .eq("admin_id", admin.id)
      .order("created_at", { ascending: true });

    if (!allForeAnnotations?.length)
      return NextResponse.json({ code: 0, data: [], message: "success" });

    // 4. 获取显式 foreshadowing 记录（简化查询，避免 join 过滤掉数据）
    const { data: explicitRows } = await supabase
      .from("foreshadowing")
      .select(`*`)
      .eq("book_id", bookId)
      .eq("admin_id", admin.id);

    // 5. 获取这些显式记录的 resolutions
    const explicitIds = (explicitRows || []).map((r) => r.id);
    const resolutionsMap = new Map<string, any[]>();
    if (explicitIds.length > 0) {
      const { data: resolutions } = await (supabase as any)
        .from("foreshadowing_resolutions")
        .select(`*, resolved_annotation:annotations(*)`)
        .in("foreshadowing_id", explicitIds);

      for (const r of resolutions || []) {
        if (!resolutionsMap.has(r.foreshadowing_id)) {
          resolutionsMap.set(r.foreshadowing_id, []);
        }
        resolutionsMap.get(r.foreshadowing_id)!.push(r);
      }
    }

    // 6. 建立 annotation_id -> foreshadowing 映射
    const annotationToExplicit = new Map<string, any>();
    for (const row of explicitRows || []) {
      if (row.planted_annotation_id) {
        annotationToExplicit.set(row.planted_annotation_id, row);
      }
    }

    // 7. 为每个带「伏笔」标签的标注生成条目（确保不遗漏）
    const result = allForeAnnotations.map((ann) => {
      const explicit = annotationToExplicit.get(ann.id);
      if (explicit) {
        const resolutions = resolutionsMap.get(explicit.id) || [];
        return {
          ...explicit,
          planted_annotation: ann,
          resolved_annotations: resolutions
            .map((r: any) => r.resolved_annotation)
            .filter(Boolean),
          status: resolutions.length > 0 ? "resolved" : "pending",
        };
      }
      // 无显式记录则生成 auto
      return {
        id: `auto-${ann.id}`,
        title: ann.selected_text,
        status: "pending",
        planted_annotation: ann,
        resolved_annotations: [],
        created_at: ann.created_at,
      };
    });

    return NextResponse.json({ code: 0, data: result, message: "success" });
  } catch (err: any) {
    return NextResponse.json(
      { code: 500, data: null, message: err.message },
      { status: 500 },
    );
  }
}

export async function POST(
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
    const body = await request.json();

    const { data, error } = await supabase
      .from("foreshadowing")
      .insert({
        book_id: bookId,
        admin_id: admin.id,
        title: body.title,
        planted_annotation_id: body.planted_annotation_id || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ code: 0, data, message: "success" });
  } catch (err: any) {
    return NextResponse.json(
      { code: 500, data: null, message: err.message },
      { status: 500 },
    );
  }
}

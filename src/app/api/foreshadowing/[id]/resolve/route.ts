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
    const { data: foreLabels, error: labelError } = await supabase
      .from("labels")
      .select("id")
      .eq("book_id", bookId)
      .eq("admin_id", admin.id)
      .ilike("name", "%伏笔%");
    if (labelError) throw labelError;
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

    // 4. 获取显式 foreshadowing 记录
    const { data: explicitRows } = await supabase
      .from("foreshadowing")
      .select(
        `*, planted_annotation:annotations!foreshadowing_planted_annotation_id_fkey(*), resolutions:foreshadowing_resolutions(*, resolved_annotation:annotations(*))`,
      )
      .eq("book_id", bookId)
      .eq("admin_id", admin.id)
      .order("created_at", { ascending: true });

    // 5. 找出已有 foreshadowing 的 annotation_id
    const coveredIds = new Set(
      (explicitRows || []).map((r) => r.planted_annotation_id).filter(Boolean),
    );

    // 6. 格式化显式记录
    const explicitResult = (explicitRows || []).map((fs: any) => ({
      ...fs,
      resolved_annotations: (fs.resolutions || [])
        .map((r: any) => r.resolved_annotation)
        .filter(Boolean),
      status: (fs.resolutions?.length || 0) > 0 ? "resolved" : "pending",
    }));

    // 7. 为未覆盖的标注生成 auto 记录
    const autoResult = (allForeAnnotations || [])
      .filter((ann) => !coveredIds.has(ann.id))
      .map((ann) => ({
        id: `auto-${ann.id}`,
        title: ann.selected_text,
        status: "pending",
        planted_annotation: ann,
        resolved_annotations: [],
        created_at: ann.created_at,
      }));

    return NextResponse.json({
      code: 0,
      data: [...explicitResult, ...autoResult],
      message: "success",
    });
  } catch (err: any) {
    return NextResponse.json(
      { code: 500, data: null, message: err.message },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin)
      return NextResponse.json(
        { code: 401, message: "未登录" },
        { status: 401 },
      );

    const supabase = supabaseServer();
    const { id } = await params;
    const body = await request.json();

    // 验证 foreshadowing 归属
    const { data: fs } = await supabase
      .from("foreshadowing")
      .select("id")
      .eq("id", id)
      .eq("admin_id", admin.id)
      .single();

    if (!fs)
      return NextResponse.json(
        { code: 403, message: "无权操作" },
        { status: 403 },
      );

    const { data, error } = await (supabase as any)
      .from("foreshadowing_resolutions")
      .insert({
        foreshadowing_id: id,
        resolved_annotation_id: body.resolved_annotation_id,
      })
      .select("*, resolved_annotation:annotations(*)")
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin)
      return NextResponse.json(
        { code: 401, message: "未登录" },
        { status: 401 },
      );

    const supabase = supabaseServer();
    const { id } = await params;

    const { error } = await (supabase as any)
      .from("foreshadowing_resolutions")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ code: 0, message: "deleted" });
  } catch (err: any) {
    return NextResponse.json(
      { code: 500, data: null, message: err.message },
      { status: 500 },
    );
  }
}

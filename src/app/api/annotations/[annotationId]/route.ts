import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ annotationId: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin)
      return NextResponse.json(
        { code: 401, data: null, message: "未登录" },
        { status: 401 },
      );

    const supabase = supabaseServer();
    const { annotationId } = await params; // ← 新增
    const body = await request.json();

    if (body.note !== undefined) {
      const { error } = await supabase
        .from("annotations")
        .update({ note: body.note || null })
        .eq("id", annotationId) // ← 改
        .eq("admin_id", admin.id);
      if (error) throw error;
    }
    if (body.label_ids !== undefined) {
      const { error: delError } = await supabase
        .from("annotation_labels")
        .delete()
        .eq("annotation_id", annotationId); // ← 改
      if (delError) throw delError;
      const labelIds = body.label_ids || [];
      if (labelIds.length > 0) {
        const links = labelIds.map((labelId: string) => ({
          annotation_id: annotationId, // ← 改
          label_id: labelId,
        }));
        const { error: insError } = await supabase
          .from("annotation_labels")
          .insert(links);
        if (insError) throw insError;
      }
    }
    return NextResponse.json({ code: 0, data: null, message: "updated" });
  } catch (err: any) {
    return NextResponse.json(
      { code: 500, data: null, message: err.message },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ annotationId: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin)
      return NextResponse.json(
        { code: 401, data: null, message: "未登录" },
        { status: 401 },
      );

    const supabase = supabaseServer();
    const { annotationId } = await params; // ← 新增

    const { error } = await supabase
      .from("annotations")
      .delete()
      .eq("id", annotationId) // ← 改
      .eq("admin_id", admin.id);
    if (error) throw error;
    return NextResponse.json({ code: 0, data: null, message: "deleted" });
  } catch (err: any) {
    return NextResponse.json(
      { code: 500, data: null, message: err.message },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin)
      return NextResponse.json(
        { code: 401, data: null, message: "未登录" },
        { status: 401 },
      );

    const supabase = supabaseServer();
    const { id } = await params; // ← 修复：先 await 解构
    const body = await request.json();

    const { error } = await supabase
      .from("foreshadowing")
      .update({
        resolved_annotation_id: body.resolved_annotation_id || null,
        status: body.status || "pending",
        resolved_at:
          body.status === "resolved" ? new Date().toISOString() : null,
      })
      .eq("id", id) // ← 用解构后的 id
      .eq("admin_id", admin.id);

    if (error) throw error;
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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin)
      return NextResponse.json(
        { code: 401, data: null, message: "未登录" },
        { status: 401 },
      );

    const supabase = supabaseServer();
    const { id } = await params; // ← 同样修复

    const { error } = await supabase
      .from("foreshadowing")
      .delete()
      .eq("id", id)
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

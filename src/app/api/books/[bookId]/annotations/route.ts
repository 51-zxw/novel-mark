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
        { code: 401, data: null, message: "未登录" },
        { status: 401 },
      );

    const supabase = supabaseServer();
    const { bookId } = await params;

    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get("chapterId");

    let query = supabase
      .from("annotations")
      .select(
        `*, chapter:chapters(id, title, order), labels:annotation_labels(label:labels(id, name, color, is_system))`,
      )
      .eq("book_id", bookId)
      .eq("admin_id", admin.id)
      .order("created_at", { ascending: false });

    if (chapterId) query = query.eq("chapter_id", chapterId);

    const { data, error } = await query;
    if (error) throw error;

    const flattened = (data || []).map((item: any) => ({
      ...item,
      labels: (item.labels || []).map((l: any) => l.label).filter(Boolean),
    }));

    return NextResponse.json({
      code: 0,
      data: flattened,
      message: "success",
    });
  } catch (err: any) {
    return NextResponse.json(
      { code: 500, data: null, message: err.message },
      { status: 500 },
    );
  }
}

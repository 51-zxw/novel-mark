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
    const { bookId } = await params;  // ← 修复：bookId + await

    const { data, error } = await supabase
      .from("labels")
      .select("*")
      .or(`book_id.eq.${bookId},book_id.is.null`)
      .eq("admin_id", admin.id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ code: 0, data: data || [], message: "success" });
  } catch (err: any) {
    return NextResponse.json(
      { code: 500, data: null, message: err.message },
      { status: 500 },
    );
  }
}
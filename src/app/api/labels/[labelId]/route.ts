import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ labelId: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin)
      return NextResponse.json(
        { code: 401, data: null, message: "未登录" },
        { status: 401 },
      );

    const supabase = supabaseServer();
    const { labelId } = await params;

    const { error } = await supabase
      .from("labels")
      .delete()
      .eq("id", labelId)
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
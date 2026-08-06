import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin)
      return NextResponse.json(
        { code: 401, data: null, message: "未登录" },
        { status: 401 },
      );

    const supabase = supabaseServer();
    const body = await request.json();

    const { data, error } = await supabase
      .from("labels")
      .insert({
        book_id: body.book_id || null,
        admin_id: admin.id,
        name: body.name,
        color: body.color || "#c8a165",
        is_system: false,
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

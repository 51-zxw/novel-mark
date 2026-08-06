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

    const { data, error } = await (supabase as any)
      .from("character_relations")
      .select("*")
      .eq("book_id", bookId)
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

    const { data, error } = await (supabase as any)
      .from("character_relations")
      .insert({
        book_id: bookId,
        admin_id: admin.id,
        source_name: body.source_name,
        target_name: body.target_name,
        relation_type: body.relation_type,
        description: body.description || null,
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

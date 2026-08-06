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

    if (
      !body.book_id ||
      !body.chapter_id ||
      body.start_offset === undefined ||
      body.end_offset === undefined
    ) {
      return NextResponse.json(
        { code: 400, data: null, message: "缺少必要参数" },
        { status: 400 },
      );
    }

    const { data: annotation, error: annError } = await supabase
      .from("annotations")
      .insert({
        book_id: body.book_id,
        chapter_id: body.chapter_id,
        admin_id: admin.id,
        start_offset: body.start_offset,
        end_offset: body.end_offset,
        selected_text: body.selected_text || "",
        note: body.note || null,
      })
      .select()
      .single();
    if (annError) throw annError;

    const labelIds = body.label_ids || [];
    if (labelIds.length > 0) {
      const links = labelIds.map((labelId: string) => ({
        annotation_id: annotation.id,
        label_id: labelId,
      }));
      const { error: linkError } = await supabase
        .from("annotation_labels")
        .insert(links);
      if (linkError) throw linkError;
    }
    return NextResponse.json({ code: 0, data: annotation, message: "success" });
  } catch (err: any) {
    return NextResponse.json(
      { code: 500, data: null, message: err.message },
      { status: 500 },
    );
  }
}

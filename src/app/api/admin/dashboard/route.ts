import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const sb = supabaseAdmin();
  const [books, chapters] = await Promise.all([
    sb.from("books").select("id"),
    sb.from("chapters").select("id"),
  ]);

  return NextResponse.json({
    bookCount: ((books.data as unknown[]) || []).length,
    chapterCount: ((chapters.data as unknown[]) || []).length,
  });
}

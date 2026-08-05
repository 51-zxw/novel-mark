import { NextResponse } from "next/server";
import { fetchVolumeChapters } from "@/lib/supabase/queries";

export const revalidate = 1800;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookId: string; volumeId: string }> }
) {
  const { volumeId } = await params;

  try {
    const chapters = await fetchVolumeChapters(volumeId);
    const result = chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      order: ch.order,
      word_count: ch.word_count,
    }));

    return NextResponse.json(
      { chapters: result },
      {
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("加载卷章节失败:", error);
    return NextResponse.json(
      { error: "加载失败" },
      { status: 500 }
    );
  }
}

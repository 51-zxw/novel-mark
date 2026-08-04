import { NextResponse } from "next/server";
import { fetchVolumesWithAllChapters } from "@/lib/supabase/queries";

export const revalidate = 1800;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;

  try {
    const { volumes, chaptersMap } = await fetchVolumesWithAllChapters(bookId);

    const result = volumes.map((v) => ({
      id: v.id,
      title: v.title,
      order: v.order,
      chapters: (chaptersMap.get(v.id) || []).map((ch) => ({
        id: ch.id,
        title: ch.title,
        order: ch.order,
        word_count: ch.word_count,
      })),
    }));

    return NextResponse.json(
      { volumes: result },
      {
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("加载目录失败:", error);
    return NextResponse.json(
      { error: "加载失败" },
      { status: 500 }
    );
  }
}

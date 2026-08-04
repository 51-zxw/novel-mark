import { NextResponse } from "next/server";
import { fetchVolumeChapters } from "@/lib/supabase/queries";

// 设置缓存时间：30分钟
export const revalidate = 1800;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ volumeId: string }> }
) {
  const { volumeId } = await params;

  try {
    const chapters = await fetchVolumeChapters(volumeId);
    return NextResponse.json(
      { chapters },
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

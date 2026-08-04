import { NextResponse } from "next/server";
import { fetchVolumeChapters } from "@/lib/supabase/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ volumeId: string }> }
) {
  const { volumeId } = await params;

  try {
    const chapters = await fetchVolumeChapters(volumeId);
    return NextResponse.json({ chapters });
  } catch (error) {
    console.error("加载卷章节失败:", error);
    return NextResponse.json(
      { error: "加载失败" },
      { status: 500 }
    );
  }
}

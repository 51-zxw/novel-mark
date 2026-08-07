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

    // 1. 获取角色标签
    const { data: roleLabels } = await supabase
      .from("labels")
      .select("id, color")
      .eq("book_id", bookId)
      .eq("admin_id", admin.id)
      .ilike("name", "%角色%");

    const roleLabelIds = roleLabels?.map((l) => l.id) || [];
    if (roleLabelIds.length === 0) {
      return NextResponse.json({
        code: 0,
        data: { nodes: [], links: [] },
        message: "success",
      });
    }
    const defaultColor = roleLabels?.[0]?.color || "#c8a165";

    // 2. 获取所有角色标注（带上 chapter_id 和 start_offset）
    const { data: roleAnns } = await supabase
      .from("annotations")
      .select("id, selected_text, chapter_id, start_offset")
      .eq("book_id", bookId)
      .eq("admin_id", admin.id)
      .in(
        "id",
        (
          await supabase
            .from("annotation_labels")
            .select("annotation_id")
            .in("label_id", roleLabelIds)
        ).data?.map((l) => l.annotation_id) || [],
      );

    // 3. 统计每个角色出现次数，并记录首次出现位置
    const nameCount = new Map<string, number>();
    const firstSeen = new Map<
      string,
      { chapter_id: string; start_offset: number }
    >();

    for (const ann of roleAnns || []) {
      const name = ann.selected_text.trim();
      if (!name) continue;

      nameCount.set(name, (nameCount.get(name) || 0) + 1);

      // 只记录第一次出现的位置
      if (!firstSeen.has(name)) {
        firstSeen.set(name, {
          chapter_id: ann.chapter_id,
          start_offset: ann.start_offset ?? 0,
        });
      }
    }

    const uniqueNames = Array.from(nameCount.keys());

    // 4. 构建节点（带上 chapter_id 和 start_offset）
    const nodes = uniqueNames.map((name) => {
      const first = firstSeen.get(name)!;
      return {
        id: name,
        name,
        color: defaultColor,
        val: nameCount.get(name) || 1,
        chapter_id: first.chapter_id,
        start_offset: first.start_offset,
      };
    });

    // 5. 获取手动关系
    const { data: relations, error: relError } = await (supabase as any)
      .from("character_relations")
      .select("*")
      .eq("book_id", bookId)
      .eq("admin_id", admin.id);

    if (relError) throw relError;

    const links = (relations || []).map(
      (r: {
        source_name: any;
        target_name: any;
        relation_type: any;
        description: any;
      }) => ({
        source: r.source_name,
        target: r.target_name,
        value: 2,
        relation_type: r.relation_type,
        description: r.description,
      }),
    );

    return NextResponse.json({
      code: 0,
      data: { nodes, links },
      message: "success",
    });
  } catch (err: any) {
    return NextResponse.json(
      { code: 500, data: null, message: err.message },
      { status: 500 },
    );
  }
}

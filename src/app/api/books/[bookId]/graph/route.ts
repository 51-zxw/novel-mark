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

    // 1. 获取所有角色标注（用于节点列表）
    const { data: roleLabels } = await supabase
      .from("labels")
      .select("id, color")
      .eq("book_id", bookId)
      .eq("admin_id", admin.id)
      .ilike("name", "%角色%");

    const roleLabelIds = roleLabels?.map((l) => l.id) || [];
    const defaultColor = roleLabels?.[0]?.color || "#c8a165";

    // 获取所有角色名（去重）
    const { data: roleAnns } = await supabase
      .from("annotations")
      .select("selected_text")
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

    const uniqueNames = [
      ...new Set(
        (roleAnns || []).map((a) => a.selected_text.trim()).filter(Boolean),
      ),
    ];

    // 2. 获取手动关系
    const { data: relations, error: relError } = await (supabase as any)
      .from("character_relations")
      .select("*")
      .eq("book_id", bookId)
      .eq("admin_id", admin.id);

    if (relError) throw relError;

    // 3. 统计每个角色出现次数（决定节点大小）
    const nameCount = new Map<string, number>();
    for (const ann of roleAnns || []) {
      const name = ann.selected_text.trim();
      nameCount.set(name, (nameCount.get(name) || 0) + 1);
    }

    // 4. 构建节点
    const nodeMap = new Map<
      string,
      { id: string; name: string; color: string; val: number }
    >();
    for (const name of uniqueNames) {
      nodeMap.set(name, {
        id: name,
        name,
        color: defaultColor,
        val: nameCount.get(name) || 1,
      });
    }

    // 5. 构建边（手动关系）
    const links = (relations || []).map(
      (r: {
        source_name: any;
        target_name: any;
        relation_type: any;
        description: any;
      }) => ({
        source: r.source_name,
        target: r.target_name,
        value: 2, // 手动关系固定粗细
        relation_type: r.relation_type,
        description: r.description,
      }),
    );

    return NextResponse.json({
      code: 0,
      data: {
        nodes: Array.from(nodeMap.values()),
        links,
      },
      message: "success",
    });
  } catch (err: any) {
    return NextResponse.json(
      { code: 500, data: null, message: err.message },
      { status: 500 },
    );
  }
}

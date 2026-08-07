import { supabaseServer } from "./server"; // 一期已有的服务端 supabase client
import { getCurrentAdmin } from "@/lib/auth";
import type {
  Label,
  AnnotationWithLabels,
  Foreshadowing,
  GraphData,
  TimelineItem,
  GraphNode,
  GraphLink,
} from "@/types/database";

/**
 * 获取带当前 admin_id 上下文的 supabase client
 * 通过 set_config 设置 RLS 变量，使 RLS 策略生效
 */
async function getSupabaseWithAdmin() {
  const supabase = supabaseServer();
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("Unauthorized");
  return { supabase, admin };
}

// ============================================
// Labels 查询
// ============================================

export async function getLabels(bookId: string): Promise<Label[]> {
  const { supabase, admin } = await getSupabaseWithAdmin();
  const { data, error } = await supabase
    .from("labels")
    .select("*")
    .or(`book_id.eq.${bookId},book_id.is.null`)
    .eq("admin_id", admin.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createLabel(params: {
  book_id?: string | null;
  name: string;
  color?: string;
}): Promise<Label> {
  const { supabase, admin } = await getSupabaseWithAdmin();
  const { data, error } = await supabase
    .from("labels")
    .insert({ ...params, admin_id: admin.id, color: params.color || "#c8a165" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLabel(labelId: string): Promise<void> {
  const { supabase, admin } = await getSupabaseWithAdmin();
  const { error } = await supabase
    .from("labels")
    .delete()
    .eq("id", labelId)
    .eq("admin_id", admin.id);
  if (error) throw error;
}

// ============================================
// Annotations 查询
// ============================================

export async function getAnnotationsByBook(
  bookId: string,
  filters?: { chapterId?: string; labelId?: string },
): Promise<AnnotationWithLabels[]> {
  const { supabase, admin } = await getSupabaseWithAdmin();
  let query = supabase
    .from("annotations")
    .select(
      `*, chapter:chapters(id, title, order), labels:annotation_labels(label:labels(id, name, color, is_system))`,
    )
    .eq("book_id", bookId)
    .eq("admin_id", admin.id)
    .order("created_at", { ascending: false });
  if (filters?.chapterId) query = query.eq("chapter_id", filters.chapterId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((item: any) => ({
    ...item,
    labels: (item.labels || []).map((l: any) => l.label).filter(Boolean),
  })) as AnnotationWithLabels[];
}

export async function getAnnotationsByChapter(
  chapterId: string,
): Promise<AnnotationWithLabels[]> {
  const { supabase, admin } = await getSupabaseWithAdmin();
  const { data, error } = await supabase
    .from("annotations")
    .select(
      `*, labels:annotation_labels(label:labels(id, name, color, is_system))`,
    )
    .eq("chapter_id", chapterId)
    .eq("admin_id", admin.id)
    .order("start_offset", { ascending: true });
  if (error) throw error;
  return (data || []).map((item: any) => ({
    ...item,
    labels: (item.labels || []).map((l: any) => l.label).filter(Boolean),
  })) as AnnotationWithLabels[];
}

export async function createAnnotation(params: {
  book_id: string;
  chapter_id: string;
  start_offset: number;
  end_offset: number;
  selected_text: string;
  note?: string;
  label_ids: string[];
}): Promise<AnnotationWithLabels> {
  const { supabase, admin } = await getSupabaseWithAdmin();
  const { data: annotation, error: annError } = await supabase
    .from("annotations")
    .insert({
      book_id: params.book_id,
      chapter_id: params.chapter_id,
      admin_id: admin.id,
      start_offset: params.start_offset,
      end_offset: params.end_offset,
      selected_text: params.selected_text,
      note: params.note || null,
    })
    .select()
    .single();
  if (annError) throw annError;

  if (params.label_ids.length > 0) {
    const links = params.label_ids.map((labelId) => ({
      annotation_id: annotation.id,
      label_id: labelId,
    }));
    const { error: linkError } = await supabase
      .from("annotation_labels")
      .insert(links);
    if (linkError) throw linkError;
  }
  return { ...annotation, labels: [] };
}

export async function updateAnnotation(
  annotationId: string,
  params: { note?: string; label_ids?: string[] },
): Promise<void> {
  const { supabase, admin } = await getSupabaseWithAdmin();
  if (params.note !== undefined) {
    const { error } = await supabase
      .from("annotations")
      .update({ note: params.note || null })
      .eq("id", annotationId)
      .eq("admin_id", admin.id);
    if (error) throw error;
  }
  if (params.label_ids !== undefined) {
    const { error: delError } = await supabase
      .from("annotation_labels")
      .delete()
      .eq("annotation_id", annotationId);
    if (delError) throw delError;
    if (params.label_ids.length > 0) {
      const links = params.label_ids.map((labelId) => ({
        annotation_id: annotationId,
        label_id: labelId,
      }));
      const { error: insError } = await supabase
        .from("annotation_labels")
        .insert(links);
      if (insError) throw insError;
    }
  }
}

export async function deleteAnnotation(annotationId: string): Promise<void> {
  const { supabase, admin } = await getSupabaseWithAdmin();
  const { error } = await supabase
    .from("annotations")
    .delete()
    .eq("id", annotationId)
    .eq("admin_id", admin.id);
  if (error) throw error;
}

// ============================================
// 关系图数据查询
// ============================================

export async function getGraphData(bookId: string): Promise<GraphData> {
  const { supabase, admin } = await getSupabaseWithAdmin();
  const { data: roleLabels, error: labelError } = await supabase
    .from("labels")
    .select("id, name, color")
    .eq("book_id", bookId)
    .eq("admin_id", admin.id)
    .ilike("name", "%角色%");
  if (labelError) throw labelError;
  if (!roleLabels || roleLabels.length === 0) return { nodes: [], links: [] };

  const roleLabelIds = roleLabels.map((l) => l.id);
  const { data: annotations, error: annError } = await supabase
    .from("annotations")
    .select(
      `id, chapter_id, start_offset, selected_text, labels:annotation_labels!inner(label_id)`,
    )
    .eq("book_id", bookId)
    .eq("admin_id", admin.id)
    .in("labels.label_id", roleLabelIds);
  if (annError) throw annError;

  const nodeMap = new Map<string, GraphNode>();
  const firstSeen = new Map<
    string,
    { chapter_id: string; start_offset: number }
  >();
  const chapterRoles = new Map<string, Set<string>>();

  for (const ann of annotations || []) {
    const roleName = ann.selected_text.trim();
    if (!roleName) continue;

    // 记录首次出现位置（只记第一次）
    if (!firstSeen.has(roleName)) {
      firstSeen.set(roleName, {
        chapter_id: ann.chapter_id,
        start_offset: ann.start_offset ?? 0,
      });
    }

    if (!nodeMap.has(roleName)) {
      nodeMap.set(roleName, {
        id: roleName,
        name: roleName,
        color: roleLabels[0]?.color || "#c8a165",
        val: 1,
      });
    } else {
      nodeMap.get(roleName)!.val += 1;
    }

    if (!chapterRoles.has(ann.chapter_id))
      chapterRoles.set(ann.chapter_id, new Set());
    chapterRoles.get(ann.chapter_id)!.add(roleName);
  }

  // 把首次出现位置写回 node
  for (const [name, node] of nodeMap) {
    const first = firstSeen.get(name);
    if (first) {
      node.chapter_id = first.chapter_id;
      node.start_offset = first.start_offset;
    }
  }

  const linkMap = new Map<string, GraphLink>();
  for (const [, roles] of chapterRoles) {
    const roleList = Array.from(roles);
    for (let i = 0; i < roleList.length; i++) {
      for (let j = i + 1; j < roleList.length; j++) {
        const key = [roleList[i], roleList[j]].sort().join("|");
        if (!linkMap.has(key))
          linkMap.set(key, {
            source: roleList[i],
            target: roleList[j],
            value: 1,
          });
        else linkMap.get(key)!.value += 1;
      }
    }
  }
  return {
    nodes: Array.from(nodeMap.values()),
    links: Array.from(linkMap.values()),
  };
}

// ============================================
// 时间线数据查询
// ============================================

export async function getTimelineData(bookId: string): Promise<TimelineItem[]> {
  const { supabase, admin } = await getSupabaseWithAdmin();
  const { data: plotLabels, error: labelError } = await supabase
    .from("labels")
    .select("id")
    .eq("book_id", bookId)
    .eq("admin_id", admin.id)
    .ilike("name", "%剧情%");
  if (labelError) throw labelError;
  if (!plotLabels || plotLabels.length === 0) return [];

  const plotLabelIds = plotLabels.map((l) => l.id);
  const { data, error } = await supabase
    .from("annotations")
    .select(
      `id, selected_text, created_at, chapter:chapters(order, title), labels:annotation_labels(label:labels(id, name, color))`,
    )
    .eq("book_id", bookId)
    .eq("admin_id", admin.id)
    .in("labels.label_id", plotLabelIds)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (data || []).map((item: any) => ({
    id: item.id,
    title: item.selected_text,
    chapter_order: item.chapter?.order || 0,
    chapter_title: item.chapter?.title || "",
    created_at: item.created_at,
    labels: (item.labels || []).map((l: any) => l.label).filter(Boolean),
  })) as TimelineItem[];
}

// ============================================
// 伏笔追踪查询
// ============================================

export async function getForeshadowing(
  bookId: string,
): Promise<Foreshadowing[]> {
  const { supabase, admin } = await getSupabaseWithAdmin();
  const { data, error } = await supabase
    .from("foreshadowing")
    .select(
      `*, planted_annotation:annotations!foreshadowing_planted_annotation_id_fkey(*), resolved_annotation:annotations!foreshadowing_resolved_annotation_id_fkey(*)`,
    )
    .eq("book_id", bookId)
    .eq("admin_id", admin.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as Foreshadowing[];
}

export async function createForeshadowing(params: {
  book_id: string;
  title: string;
  planted_annotation_id?: string;
}): Promise<Foreshadowing> {
  const { supabase, admin } = await getSupabaseWithAdmin();
  const { data, error } = await supabase
    .from("foreshadowing")
    .insert({
      book_id: params.book_id,
      admin_id: admin.id,
      title: params.title,
      planted_annotation_id: params.planted_annotation_id || null,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return data as Foreshadowing;
}

export async function resolveForeshadowing(
  id: string,
  resolvedAnnotationId: string,
): Promise<void> {
  const { supabase, admin } = await getSupabaseWithAdmin();
  const { error } = await supabase
    .from("foreshadowing")
    .update({
      resolved_annotation_id: resolvedAnnotationId,
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("admin_id", admin.id);
  if (error) throw error;
}

export async function deleteForeshadowing(id: string): Promise<void> {
  const { supabase, admin } = await getSupabaseWithAdmin();
  const { error } = await supabase
    .from("foreshadowing")
    .delete()
    .eq("id", id)
    .eq("admin_id", admin.id);
  if (error) throw error;
}

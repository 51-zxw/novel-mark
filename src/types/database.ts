export type Book = {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  description: string | null;
  total_word_count: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Volume = {
  id: string;
  book_id: string;
  title: string;
  order: number;
  created_at: string;
};

export type Chapter = {
  id: string;
  book_id: string;
  volume_id: string | null;
  order: number;
  title: string;
  word_count: number;
  proofread?: boolean;
  created_at: string;
};

export type Section = {
  id: string;
  chapter_id: string;
  content: string;
  updated_at: string;
};

export type AdminUser = {
  id: string;
  username: string;
  password_hash: string;
  last_login: string | null;
  created_at: string;
};

export type ReadingProgress = {
  id: string;
  user_id: string;
  book_id: string;
  chapter_id: string;
  scroll_position: number;
  updated_at: string;
};

// 用于目录页的聚合数据
export type VolumeWithChapters = Volume & {
  chapters: Chapter[];
};

// ============================================
// 二期：标注功能类型定义
// ============================================

export interface Label {
  id: string;
  book_id: string | null;
  admin_id: string;
  name: string;
  color: string;
  is_system: boolean;
  created_at: string;
}

export interface Annotation {
  id: string;
  book_id: string;
  chapter_id: string;
  admin_id: string;
  start_offset: number;
  end_offset: number;
  selected_text: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  labels?: Label[];
  chapter?: { id: string; title: string; order: number };
}

export interface AnnotationWithLabels extends Annotation {
  labels: Label[];
}

export interface AnnotationLabel {
  annotation_id: string;
  label_id: string;
}

export interface Foreshadowing {
  id: string;
  book_id: string;
  admin_id: string;
  title: string;
  planted_annotation_id: string | null;
  resolved_annotation_id: string | null;
  status: "pending" | "resolved";
  created_at: string;
  resolved_at: string | null;
  planted_annotation?: Annotation;
  resolved_annotation?: Annotation;
}

export interface GraphNode {
  id: string;
  name: string;
  color: string;
  val: number;
  chapter_id?: string; // ← 新增：角色首次出现的章节
  start_offset?: number; // ← 新增：角色首次出现的偏移量
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface TimelineItem {
  id: string;
  title: string;
  chapter_order: number;
  chapter_id?: string; // ← 新增
  start_offset?: number; // ← 新增
  chapter_title: string;
  created_at: string;
  labels: Label[];
}

export interface Foreshadowing {
  id: string;
  book_id: string;
  admin_id: string;
  title: string;
  planted_annotation_id: string | null;
  // resolved_annotation_id?: string | null; // 废弃，改用 resolved_annotations
  status: "pending" | "resolved";
  created_at: string;
  resolved_at: string | null;
  planted_annotation?: Annotation;
  resolved_annotations?: Annotation[]; // ← 改为数组
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
  relation_type?: string; // ← 新增
  description?: string; // ← 新增
}

export interface CharacterRelation {
  id: string;
  book_id: string;
  source_name: string;
  target_name: string;
  relation_type: string;
  description?: string;
  created_at: string;
}

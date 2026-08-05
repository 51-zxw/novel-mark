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
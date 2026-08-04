-- Supabase 性能优化 SQL
-- 在 Supabase SQL Editor 中执行
-- 执行后可显著提升查询速度

-- 1. sections 表: chapter_id 索引（查询章节正文）
CREATE INDEX IF NOT EXISTS idx_sections_chapter_id ON sections(chapter_id);

-- 2. chapters 表: book_id + order 复合索引（查询某本书的所有章节并排序）
CREATE INDEX IF NOT EXISTS idx_chapters_book_order ON chapters(book_id, "order");

-- 3. chapters 表: volume_id 索引（查询某卷下的章节）
CREATE INDEX IF NOT EXISTS idx_chapters_volume_id ON chapters(volume_id);

-- 4. volumes 表: book_id + order 复合索引（查询某本书的所有卷并排序）
CREATE INDEX IF NOT EXISTS idx_volumes_book_order ON volumes(book_id, "order");

-- 查看索引：
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';

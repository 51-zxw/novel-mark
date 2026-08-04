import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function AdminHome() {
  const session = await getSession();
  // middleware 已保护，这里 session 必存在；保留防御性判断
  if (!session) return null;

  const sb = supabaseAdmin();
  const [books, chapters] = await Promise.all([
    sb.from("books").select("*", { count: "exact", head: true }),
    sb.from("chapters").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div>
      <h1 className="font-serif text-2xl mb-6">仪表盘</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="书籍总数" value={books.count ?? 0} />
        <StatCard label="章节总数" value={chapters.count ?? 0} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] p-4">
      <div className="text-xs text-[var(--fg-muted)]">{label}</div>
      <div className="mt-2 text-2xl font-serif">{value}</div>
    </div>
  );
}

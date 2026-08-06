import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase"; // ← 自动生成的类型文件

let cachedClient: SupabaseClient<Database> | null = null;

export function supabaseServer() {
  if (cachedClient) return cachedClient;

  cachedClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // ⚠️ 注意这里：服务端操作（尤其是二期标注的增删改）需要绕过 RLS
    // 建议改成 SUPABASE_SERVICE_ROLE_KEY。如果暂时不想改，先保留 ANON_KEY 也行
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  return cachedClient;
}

export { createClient };

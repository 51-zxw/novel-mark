import { createClient } from "@supabase/supabase-js";

// ⚠️ 仅在服务端使用，绝不可暴露到浏览器
let cachedAdmin: ReturnType<typeof createClient> | null = null;

export function supabaseAdmin() {
  if (cachedAdmin) return cachedAdmin;
  cachedAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  return cachedAdmin;
}

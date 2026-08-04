import { getSession } from "@/lib/auth";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // 未登录（仅 /admin/login 能到达此处，已被 middleware 放行）
  // → 不渲染后台框架，让登录页全屏自行布局
  if (!session) return <>{children}</>;

  return <AdminLayout username={session.username}>{children}</AdminLayout>;
}

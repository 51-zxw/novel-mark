import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

/**
 * admin 路由组全局加载态。
 * 与前台 (site) 的 loading.tsx 样式一致：居中转圈 + 文案。
 */
export default function AdminLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <LoadingSpinner size={40} />
      <p className="mt-4 text-sm text-[var(--fg-muted)]">加载中...</p>
    </div>
  );
}

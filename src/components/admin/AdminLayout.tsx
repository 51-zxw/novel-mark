import { Sidebar } from "./Sidebar";

export function AdminLayout({
  children,
  username,
}: {
  children: React.ReactNode;
  username: string;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <div className="flex">
        <Sidebar username={username} />
        <main className="flex-1 min-w-0 p-8">{children}</main>
      </div>
    </div>
  );
}

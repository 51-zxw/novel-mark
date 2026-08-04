import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小说阅读",
  description: "干净纯粹的网络小说阅读平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 主题说明：
  // - CSS 默认 :root 即 dark 主题，无需 JS 即可首屏渲染 dark（无 FOUC）
  // - 浅色主题通过 .light 类覆盖，由 ThemeProvider 在客户端切换
  // - suppressHydrationWarning 必须保留：客户端 hydrate 后可能给 <html> 加 .light 类
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

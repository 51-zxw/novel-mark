import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小说阅读",
  description: "干净纯粹的网络小说阅读平台",
};

// 内联脚本：在 HTML 解析时立即应用主题，避免 FOUC（flash of unstyled content）
const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem('novel-mark-theme');
    var theme = saved === 'light' || saved === 'dark' ? saved : 'dark';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

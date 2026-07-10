import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知行 — 给我一个词，我带你看见它背后的世界",
  description: "一个帮助人理解世界、连接知识、产生行动的 AI 探索平台。输入任意主题，探索它背后的脉络、关联和行动启发。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

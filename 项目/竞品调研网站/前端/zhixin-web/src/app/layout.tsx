import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZHI XING / 知行 — Cognitive Exploration Studio",
  description: "给我一个词，我帮你看到它背后的世界。输入任意主题，生成带脉络、关系和行动启发的认知探索报告。",
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

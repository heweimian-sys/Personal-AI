import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知行 · AI 深度调研助手",
  description: "输入一个行业、产品、公司或趋势关键词，自动生成带时间线、因果关系和行动建议的调研报告。",
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

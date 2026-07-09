import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知行 · 信息追踪平台",
  description: "消除信息差 · 从知道到做到。知行帮你把碎片信息变成可阅读的深度认知。",
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
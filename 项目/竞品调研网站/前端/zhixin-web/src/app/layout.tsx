import type { Metadata } from "next";
import { Noto_Serif_SC, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

/** UI 字体 — Noto Serif SC（思源宋体，中文衬线） */
const notoSerifSC = Noto_Serif_SC({
  weight: ["400", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

/** 标题字体 — Cormorant Garamond（优雅衬线，阅读感） */
const cormorant = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

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
      <body className={`${notoSerifSC.variable} ${cormorant.variable}`}>
        {children}
      </body>
    </html>
  );
}

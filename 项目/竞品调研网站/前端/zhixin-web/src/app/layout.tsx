import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

/** UI 字体 — Inter（简洁现代） */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
});

/** 标题字体 — Playfair Display（阅读感） */
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "知信 · 认知加速器",
  description: "信息有，但脑子进不去。知信帮你把碎片信息变成可阅读的深度认知。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} ${playfair.variable}`}>
        {children}
      </body>
    </html>
  );
}

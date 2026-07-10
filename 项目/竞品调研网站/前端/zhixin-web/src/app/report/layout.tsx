/** 报告页布局 — 强制动态渲染（因为依赖 useSearchParams） */
export const dynamic = 'force-dynamic';

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

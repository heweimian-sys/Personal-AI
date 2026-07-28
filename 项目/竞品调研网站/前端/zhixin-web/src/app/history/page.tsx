'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock3, FileText, Network, RotateCcw, Trash2 } from 'lucide-react';
import { deleteReport, listReports } from '@/lib/api';
import type { ReportSummaryItem } from '@/lib/types';

function formatDate(value: string | null): string {
  if (!value) return '时间待记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<ReportSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    const data = await listReports(50);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleDelete = async (event: React.MouseEvent, id: number) => {
    event.stopPropagation();
    const ok = await deleteReport(id);
    if (ok) setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <button className="workspace-back" type="button" onClick={() => router.push('/')}>
          <ArrowLeft size={16} />
          首页
        </button>
        <div>
          <p className="workspace-eyebrow">Archive</p>
          <h1 className="workspace-title">历史报告</h1>
          <p className="workspace-subtitle">每次生成的研究都会保存在这里，方便继续阅读、复盘和删除。</p>
        </div>
        <button className="workspace-action" type="button" onClick={loadReports}>
          <RotateCcw size={15} />
          刷新
        </button>
      </header>

      {loading ? (
        <section className="workspace-empty">
          <div className="loading-spinner" />
          <span>正在读取历史报告</span>
        </section>
      ) : items.length === 0 ? (
        <section className="workspace-empty">
          <FileText size={28} />
          <h2>还没有保存的报告</h2>
          <p>从首页生成第一份报告后，它会自动出现在这里。</p>
          <button className="workspace-action primary" type="button" onClick={() => router.push('/')}>
            开始探索
          </button>
        </section>
      ) : (
        <section className="history-list">
          {items.map((item) => (
            <article
              key={item.id}
              className="history-row"
              onClick={() => router.push(`/report?id=${item.id}`)}
            >
              <div className="history-main">
                <div className="history-topline">
                  <span className="history-id">#{item.id}</span>
                  <span className="history-time">
                    <Clock3 size={12} />
                    {formatDate(item.generated_at)}
                  </span>
                </div>
                <h2>{item.query}</h2>
                <p>{item.summary}</p>
                {item.insight_title && <strong>{item.insight_title}</strong>}
              </div>
              <div className="history-metrics">
                <span><FileText size={13} /> {item.event_count} 节点</span>
                <span><Network size={13} /> {item.relation_count} 连接</span>
                <button
                  className="icon-danger-btn"
                  type="button"
                  aria-label="删除报告"
                  onClick={(event) => handleDelete(event, item.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

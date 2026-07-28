'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BrainCircuit, FileText, Lightbulb, Network, Plus, Timer } from 'lucide-react';
import { getDashboardStats } from '@/lib/api';
import type { DashboardStats } from '@/lib/types';

function formatDate(value: string | null): string {
  if (!value) return '时间待记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const EMPTY_STATS: DashboardStats = {
  total_reports: 0,
  total_events: 0,
  total_relations: 0,
  total_insights: 0,
  latest_reports: [],
};

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setStats(await getDashboardStats());
      setLoading(false);
    };
    load();
  }, []);

  const statCards = [
    { label: '报告总数', value: stats.total_reports, icon: FileText },
    { label: '知识节点', value: stats.total_events, icon: BrainCircuit },
    { label: '关系连接', value: stats.total_relations, icon: Network },
    { label: '行动洞察', value: stats.total_insights, icon: Lightbulb },
  ];

  return (
    <main className="workspace-page dashboard-page">
      <header className="workspace-header">
        <button className="workspace-back" type="button" onClick={() => router.push('/')}>
          <ArrowLeft size={16} />
          首页
        </button>
        <div>
          <p className="workspace-eyebrow">Dashboard</p>
          <h1 className="workspace-title">研究工作台</h1>
          <p className="workspace-subtitle">查看保存过的报告、知识节点和最近生成记录。</p>
        </div>
        <button className="workspace-action primary" type="button" onClick={() => router.push('/')}>
          <Plus size={15} />
          新建研究
        </button>
      </header>

      <section className="dashboard-stat-grid">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="dashboard-stat">
              <span className="dashboard-stat-icon"><Icon size={17} /></span>
              <span className="dashboard-stat-label">{card.label}</span>
              <strong>{loading ? '-' : card.value}</strong>
            </article>
          );
        })}
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-panel-head">
          <div>
            <p className="workspace-eyebrow">Recent</p>
            <h2>最近报告</h2>
          </div>
          <button className="workspace-action" type="button" onClick={() => router.push('/history')}>
            查看全部
          </button>
        </div>

        {loading ? (
          <div className="workspace-empty compact">
            <div className="loading-spinner" />
            <span>正在读取统计</span>
          </div>
        ) : stats.latest_reports.length === 0 ? (
          <div className="workspace-empty compact">
            <Timer size={24} />
            <span>暂无报告记录</span>
          </div>
        ) : (
          <div className="dashboard-report-list">
            {stats.latest_reports.map((item) => (
              <button
                key={item.id}
                className="dashboard-report-row"
                type="button"
                onClick={() => router.push(`/report?id=${item.id}`)}
              >
                <span className="dashboard-report-title">{item.query}</span>
                <span>{item.event_count} 节点 · {item.relation_count} 连接</span>
                <span>{formatDate(item.generated_at)}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

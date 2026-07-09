'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, TrendingDown, Download, Bookmark } from 'lucide-react';
import { research } from '@/lib/api';
import type { ResearchResult, EventItem, Insight } from '@/lib/types';

/** 关系类型 → 中文标签 + 符号 */
const RELATION_META: Record<string, { label: string; symbol: string }> = {
  causal: { label: '因果', symbol: '→' },
  competitive: { label: '竞争', symbol: '↔' },
  contains: { label: '包含', symbol: '⊂' },
  dependency: { label: '依赖', symbol: '⇢' },
  chain: { label: '链式', symbol: '→→' },
};

/**
 * 阅读流页面
 * 从 URL 参数获取查询词，调用后端 /api/research 获取结构化研究结果
 * 以章节叙事方式呈现事件、因果关系和来源侧注
 */
function ReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const [result, setResult] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      router.push('/');
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await research(query);
        if (!cancelled) {
          setResult(data);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : '未知错误';
          setError(`调研失败：${msg}。请确认后端服务已启动。`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [query, router]);

  /** 加载中 */
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p className="loading-text">正在深度调研「{query}」...</p>
        <p className="loading-text" style={{ fontSize: '12px', opacity: 0.6 }}>
          AI 正在搜索、提取事件、分析因果关系
        </p>
      </div>
    );
  }

  /** 出错 */
  if (error) {
    return (
      <div className="error-container">
        <TrendingDown size={32} color="#ef4444" />
        <p className="error-text">{error}</p>
        <button className="retry-btn" onClick={() => router.push('/')}>
          返回搜索
        </button>
      </div>
    );
  }

  /** 无数据 */
  if (!result) {
    return null;
  }

  return (
    <>
      {/* 顶部导航 */}
      <nav className="report-topbar">
        <button className="back-link" onClick={() => router.push('/')}>
          <ArrowLeft size={16} />
          返回搜索
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px' }}>
          知信
        </span>
      </nav>

      {/* 正文 */}
      <main className="reading-container" style={{ paddingTop: '40px', paddingBottom: '120px' }}>
        {/* 引导摘要 */}
        <section className="summary-section">
          <p className="summary-label">引导摘要</p>
          <h1 className="summary-title">{result.query}</h1>
          <div className="summary-text">{result.summary}</div>
        </section>

        {/* 章节叙事 */}
        {result.chapters.length > 0 ? (
          result.chapters.map((chapter, ci) => (
            <section key={ci} className="chapter-spacing">
              <h2 className="chapter-title">
                {ci + 1}. {chapter.title}
              </h2>
              {chapter.event_indices.map((evtIdx, ei) => {
                const event = result.events[evtIdx];
                if (!event) return null;

                // 查找与该事件相关的因果连接
                const outgoing = result.relations.filter(
                  (r) => r.from_event_index === evtIdx && chapter.event_indices.includes(r.to_event_index)
                );

                return (
                  <div key={ei}>
                    <EventCard event={event} />

                    {/* 因果连接线 */}
                    {outgoing.map((rel, ri) => {
                      const targetEvent = result.events[rel.to_event_index];
                      const meta = RELATION_META[rel.type] || { label: rel.type, symbol: '?' };
                      return (
                        <div key={ri} className="causal-line">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M12 5v14M19 12l-7 7-7-7" />
                          </svg>
                          <span className="causal-desc">
                            {meta.symbol} {meta.label}：{rel.description}
                            {targetEvent && ` → ${targetEvent.title}`}
                          </span>
                        </div>
                      );
                    })}

                    {/* 来源侧注 */}
                    {event.sources.length > 0 && (
                      <div className="side-note">
                        <p className="side-note-label">来源</p>
                        {event.sources.map((src, si) => (
                          <div key={si} className="side-note-source">
                            <ExternalLink size={12} color="var(--color-ink-muted)" />
                            <a href={src.url} target="_blank" rel="noopener noreferrer">
                              {src.name}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          ))
        ) : (
          // 无章节时直接列出所有事件
          <section className="chapter-spacing">
            <h2 className="chapter-title">关键事件</h2>
            {result.events.map((event, ei) => (
              <div key={ei}>
                <EventCard event={event} />
                {event.sources.length > 0 && (
                  <div className="side-note">
                    <p className="side-note-label">来源</p>
                    {event.sources.map((src, si) => (
                      <div key={si} className="side-note-source">
                        <ExternalLink size={12} color="var(--color-ink-muted)" />
                        <a href={src.url} target="_blank" rel="noopener noreferrer">
                          {src.name}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* 关系标签汇总 */}
        {result.relations.length > 0 && (
          <section className="chapter-spacing" style={{ marginTop: '40px' }}>
            <p className="summary-label">关系网络</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {result.relations.map((rel, ri) => {
                const meta = RELATION_META[rel.type] || { label: rel.type, symbol: '?' };
                const fromEvt = result.events[rel.from_event_index];
                const toEvt = result.events[rel.to_event_index];
                return (
                  <span key={ri} className="relation-tag">
                    {meta.symbol} {meta.label}
                    {fromEvt && toEvt && `：${fromEvt.title} → ${toEvt.title}`}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {/* 洞察总结 */}
        {result.insight && result.insight.title && (
          <InsightCard insight={result.insight} />
        )}

        {/* 操作区 */}
        <div className="action-section">
          <button
            className="action-btn action-btn-primary"
            onClick={() => {
              const data = JSON.stringify(result, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `知信_${result.query}_报告.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download size={16} />
            导出报告
          </button>
          <button
            className="action-btn action-btn-outline"
            onClick={() => router.push('/')}
          >
            <Bookmark size={16} />
            追踪此主题
          </button>
        </div>
      </main>
    </>
  );
}

/** 事件卡片组件 */
function EventCard({ event }: { event: EventItem }) {
  return (
    <div className="event-card">
      {event.date && <p className="event-date">{event.date}</p>}
      <h3 className="event-title">{event.title}</h3>
      <p className="event-summary">{event.summary}</p>
      {event.key_quote && (
        <blockquote className="event-quote">
          {event.key_quote}
        </blockquote>
      )}
      {/* 置信度 */}
      <div className="confidence-bar">
        <span className="confidence-label">置信度</span>
        <div className="confidence-track">
          <div
            className="confidence-fill"
            style={{ width: `${Math.round(event.confidence * 100)}%` }}
          />
        </div>
        <span className="confidence-label">
          {Math.round(event.confidence * 100)}%
        </span>
      </div>
    </div>
  );
}

/** 洞察卡片组件 */
function InsightCard({ insight }: { insight: Insight }) {
  /** 角色图标映射 */
  const roleLabels: Record<string, string> = {
    '投资者': '投资者',
    '创业者': '创业者',
    '求职者': '求职者',
  };

  return (
    <section className="insight-section">
      <p className="insight-label">洞察 · 第三层认知</p>
      <h2 className="insight-title">{insight.title}</h2>
      {insight.body && <p className="insight-body">{insight.body}</p>}

      {/* 关键判断 */}
      {insight.judgments.length > 0 && (
        <div className="insight-judgments">
          {insight.judgments.map((judgment, ji) => (
            <div key={ji} className="insight-judgment">
              <span className="insight-judgment-bullet">◆</span>
              <span>{judgment}</span>
            </div>
          ))}
        </div>
      )}

      {/* 分角色建议 */}
      {Object.keys(insight.suggestions).length > 0 && (
        <div className="insight-suggestions">
          {Object.entries(insight.suggestions).map(([role, suggestions]) => (
            <div key={role} className="insight-suggestion-group">
              <p className="insight-suggestion-role">
                {roleLabels[role] || role}
              </p>
              {suggestions.map((suggestion, si) => (
                <div key={si} className="insight-suggestion-item">
                  <span className="insight-suggestion-arrow">→</span>
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** 报告页（包裹 Suspense，因为 useSearchParams 需要） */
export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="loading-container">
          <div className="loading-spinner" />
          <p className="loading-text">加载中...</p>
        </div>
      }
    >
      <ReportContent />
    </Suspense>
  );
}

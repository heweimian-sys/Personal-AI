'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Bookmark,
  Home,
  FileText,
  Search,
  TrendingUp,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  Share2,
} from 'lucide-react';
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
        if (!cancelled) setResult(data);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : '未知错误';
          setError(`调研失败：${msg}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
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
        <p className="error-text">{error}</p>
        <button className="retry-btn" onClick={() => router.push('/')}>返回搜索</button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      {/* 背景光晕 */}
      <div className="glow-top-right" />
      <div className="glow-bottom-left" />

      {/* ===== 左侧边栏 ===== */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">知</div>
          <span className="sidebar-logo-text">知<span className="dot">·</span>行</span>
        </div>

        {/* 导航 */}
        <nav className="sidebar-nav">
          <a className="sidebar-nav-item" onClick={() => router.push('/')}>
            <Home size={18} /> 首页
          </a>
          <a className="sidebar-nav-item active">
            <FileText size={18} /> 调研报告
          </a>
          <a className="sidebar-nav-item">
            <Search size={18} /> 智搜
          </a>
          <a className="sidebar-nav-item">
            <TrendingUp size={18} /> 信息追踪
          </a>
          <a className="sidebar-nav-item">
            <MessageSquare size={18} /> AI 对话
          </a>
        </nav>

        <div style={{ flex: 1 }} />

        {/* 用户 */}
        <div className="sidebar-user">
          <div className="sidebar-user-icon">U</div>
          <span>用户</span>
        </div>
      </aside>

      {/* ===== 中间：阅读区 ===== */}
      <main className="main-content">
        {/* 阅读面板 */}
        <div className="reading-panel">
          {/* 标题区 */}
          <div className="report-header">
            <h1 className="report-title">{result.query}</h1>
            <div className="report-meta">
              <span className="section-eyebrow">知行研究团队</span>
              <span className="meta-sep" />
              <span className="section-eyebrow">{new Date().toISOString().split('T')[0]}</span>
              <span className="meta-sep" />
              <span className="section-eyebrow">阅读约 {Math.max(1, Math.ceil(result.events.length * 1.5))} 分钟</span>
            </div>
          </div>

          <div className="report-divider" />

          {/* 引导摘要 */}
          <section className="report-section">
            <p className="summary-label">引导摘要</p>
            <div className="summary-text">{result.summary}</div>
          </section>

          {/* 章节叙事 */}
          {result.chapters.length > 0 ? (
            result.chapters.map((chapter, ci) => (
              <section key={ci} className="chapter-block">
                <h2 className="chapter-title">
                  {ci + 1}. {chapter.title}
                </h2>

                {chapter.event_indices.map((evtIdx, ei) => {
                  const event = result.events[evtIdx];
                  if (!event) return null;

                  // 同一章节内的事件间关系
                  const outgoing = result.relations.filter(
                    (r) => r.from_event_index === evtIdx && chapter.event_indices.includes(r.to_event_index)
                  );

                  return (
                    <div key={ei} style={{ position: 'relative' }}>
                      <EventCard event={event} />

                      {/* 因果连接线 */}
                      {outgoing.map((rel, ri) => {
                        const targetEvent = result.events[rel.to_event_index];
                        const meta = RELATION_META[rel.type] || { label: rel.type, symbol: '?' };
                        return (
                          <div key={ri} className="causal-line">
                            <div className="causal-line-visual">
                              <svg width="20" height="28" viewBox="0 0 20 28" fill="none">
                                <line x1="10" y1="0" x2="10" y2="22" className="causal-line-stem" strokeWidth="2" />
                                <path d="M3 18l7 7 7-7" className="causal-line-arrow" strokeWidth="2" fill="none" strokeLinecap="round" />
                              </svg>
                            </div>
                            <div className="causal-line-content">
                              <span className="relation-tag">{meta.symbol} {meta.label}</span>
                              <span className="causal-desc">{rel.description}</span>
                              {targetEvent && <span className="causal-target">→ {targetEvent.title}</span>}
                            </div>
                          </div>
                        );
                      })}

                      {/* 来源侧注（内嵌版） */}
                      {event.sources.length > 0 && (
                        <div className="side-note">
                          <p className="side-note-label">📎 来源</p>
                          {event.sources.map((src, si) => (
                            <div key={si} className="side-note-source">
                              <a href={src.url} target="_blank" rel="noopener noreferrer">
                                {src.name} <ExternalLink size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
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
            <section className="chapter-block">
              <h2 className="chapter-title">关键事件</h2>
              {result.events.map((event, ei) => (
                <div key={ei}>
                  <EventCard event={event} />
                  {event.sources.length > 0 && (
                    <div className="side-note">
                      <p className="side-note-label">📎 来源</p>
                      {event.sources.map((src, si) => (
                        <div key={si} className="side-note-source">
                          <a href={src.url} target="_blank" rel="noopener noreferrer">{src.name}</a>
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
            <section className="report-section" style={{ marginTop: '48px' }}>
              <p className="summary-label">关系网络</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {result.relations.map((rel, ri) => {
                  const meta = RELATION_META[rel.type] || { label: rel.type, symbol: '?' };
                  const fromEvt = result.events[rel.from_event_index];
                  const toEvt = result.events[rel.to_event_index];
                  return (
                    <span key={ri} className="relation-tag" title={rel.description}>
                      {meta.symbol} {meta.label}
                      {fromEvt && toEvt && `：${fromEvt.title.slice(0, 20)}... → ${toEvt.title.slice(0, 20)}...`}
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
                a.download = `知行_${result.query}_报告.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download size={16} /> 导出报告
            </button>
            <button className="action-btn action-btn-outline" onClick={() => router.push('/')}>
              <Bookmark size={16} /> 追踪此主题
            </button>
          </div>
        </div>
      </main>

      {/* ===== 右侧目录 ===== */}
      <aside className="right-toc">
        {/* 目录 */}
        <div className="toc-section">
          <p className="toc-heading">目录</p>
          <div className="toc-links">
            <a href="#summary" className="toc-link" onClick={(e) => { e.preventDefault(); document.querySelector('.summary-label')?.scrollIntoView({ behavior: 'smooth' }); }}>
              引导摘要
            </a>
            {result.chapters.map((ch, ci) => (
              <a key={ci} href={`#chapter-${ci}`} className="toc-link" onClick={(e) => {
                e.preventDefault();
                const els = document.querySelectorAll('.chapter-title');
                if (els[ci]) els[ci].scrollIntoView({ behavior: 'smooth' });
              }}>
                {ch.title.length > 18 ? ch.title.slice(0, 18) + '...' : ch.title}
              </a>
            ))}
            {result.insight?.title && (
              <a href="#insight" className="toc-link" onClick={(e) => {
                e.preventDefault();
                document.querySelector('.insight-section')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                洞察总结
              </a>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="toc-actions">
          <button className="toc-action-btn" onClick={() => {
            const data = JSON.stringify(result, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `知行_${result.query}_报告.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}>
            <Download size={14} /> 导出 JSON
          </button>
          <button className="toc-action-btn">
            <Share2 size={14} /> 分享
          </button>
        </div>
      </aside>
    </div>
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
        <blockquote className="event-quote">{event.key_quote}</blockquote>
      )}
      {/* 置信度条 */}
      <div className="confidence-bar">
        <span className="confidence-label">置信度</span>
        <div className="confidence-track">
          <div className="confidence-fill" style={{ width: `${Math.round(event.confidence * 100)}%` }} />
        </div>
        <span className="confidence-label">{Math.round(event.confidence * 100)}%</span>
      </div>
    </div>
  );
}

/** 洞察卡片组件 */
function InsightCard({ insight }: { insight: Insight }) {
  const roleLabels: Record<string, string> = {
    '投资者': '投资者',
    '创业者': '创业者',
    '求职者': '求职者',
  };

  return (
    <section className="insight-section">
      <p className="insight-label">💡 洞察 · 第三层认知</p>
      <h2 className="insight-title" id="insight">{insight.title}</h2>
      {insight.body && <p className="insight-body">{insight.body}</p>}

      {insight.judgments.length > 0 && (
        <div className="insight-judgments" style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-brush)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>关键判断</p>
          {insight.judgments.map((judgment, ji) => (
            <div key={ji} className="insight-judgment">
              <span className="insight-judgment-bullet">◆</span>
              <span>{judgment}</span>
            </div>
          ))}
        </div>
      )}

      {Object.keys(insight.suggestions).length > 0 && (
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-brush)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>行动建议</p>
          <div className="insight-suggestions">
            {Object.entries(insight.suggestions).map(([role, suggestions]) => (
              <div key={role} className="insight-suggestion-group">
                <p className="insight-suggestion-role">{roleLabels[role] || role}</p>
                {suggestions.map((suggestion, si) => (
                  <div key={si} className="insight-suggestion-item">
                    <span className="insight-suggestion-arrow">→</span>
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="loading-container">
        <div className="loading-spinner" />
        <p className="loading-text">加载中...</p>
      </div>
    }>
      <ReportContent />
    </Suspense>
  );
}

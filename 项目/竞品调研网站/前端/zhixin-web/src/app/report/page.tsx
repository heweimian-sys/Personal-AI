'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Download,
  Copy,
  Check,
  Home,
  FileText,
  ExternalLink,
  RotateCcw,
  Code,
} from 'lucide-react';
import { research } from '@/lib/api';
import type { ResearchResult, EventItem, Insight, QueryProfile, Relation } from '@/lib/types';

/** 关系类型 → 中文标签 + 符号 + 颜色 */
const RELATION_META: Record<string, { label: string; symbol: string; color: string }> = {
  causal:      { label: '因果', symbol: '→',   color: '#B89968' },
  competitive: { label: '竞争', symbol: '↔',   color: '#C17A4B' },
  contains:    { label: '包含', symbol: '⊂',   color: '#7B9EA8' },
  dependency:  { label: '依赖', symbol: '⇢',   color: '#7A8B6F' },
  chain:       { label: '链式', symbol: '→→', color: '#D4A847' },
};

/** AI 思考过程步骤 */
const LOADING_STEPS = [
  { label: '正在理解你的问题', desc: '分析关键词的含义和意图' },
  { label: '正在连接不同领域', desc: '从多个来源搜索相关信息' },
  { label: '正在寻找隐藏关联', desc: '梳理事件间的因果脉络' },
  { label: '正在形成新的视角', desc: '组织章节、生成洞察和建议' },
];

/* ============================================
   知识图谱组件 — SVG 节点+连线
   ============================================ */
function KnowledgeGraph({ events, relations }: { events: EventItem[]; relations: Relation[] }) {
  if (events.length === 0) return null;

  // 简单的圆形布局
  const centerX = 300;
  const centerY = 140;
  const radius = 90;

  const nodes = events.map((evt, i) => {
    const angle = (i / events.length) * Math.PI * 2 - Math.PI / 2;
    const r = events.length === 1 ? 0 : radius;
    return {
      id: i,
      x: centerX + Math.cos(angle) * r,
      y: centerY + Math.sin(angle) * r,
      label: evt.title.length > 8 ? evt.title.slice(0, 7) + '…' : evt.title,
      fullLabel: evt.title,
      confidence: evt.confidence,
    };
  });

  return (
    <div className="graph-container">
      <svg viewBox="0 0 600 280" preserveAspectRatio="xMidYMid meet">
        {/* 连接线 */}
        {relations.map((rel, i) => {
          const from = nodes[rel.from_event_index];
          const to = nodes[rel.to_event_index];
          if (!from || !to) return null;
          const meta = RELATION_META[rel.type] || { color: '#8B8378' };
          const isDashed = rel.confidence < 0.6;
          return (
            <line
              key={`line-${i}`}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={meta.color}
              strokeWidth={1.5}
              opacity={0.4}
              strokeDasharray={isDashed ? '4,3' : undefined}
            >
              <title>{`${from.fullLabel} ${meta.symbol} ${to.fullLabel}`}</title>
            </line>
          );
        })}

        {/* 节点 */}
        {nodes.map((node) => (
          <g key={`node-${node.id}`}>
            {/* 外环（hover 区域） */}
            <circle
              cx={node.x} cy={node.y}
              r={Math.max(8, 10 + node.confidence * 8)}
              fill="none"
              stroke="rgba(23,23,23,0.06)"
              strokeWidth={8}
            />
            {/* 实心节点 */}
            <circle
              cx={node.x} cy={node.y}
              r={Math.max(5, 6 + node.confidence * 6)}
              fill={node.id === 0 ? '#171717' : '#B89968'}
              opacity={0.85}
            >
              <title>{node.fullLabel}</title>
            </circle>
            {/* 标签 */}
            <text
              x={node.x}
              y={node.y + Math.max(5, 6 + node.confidence * 6) + 14}
              textAnchor="middle"
              fontSize="10"
              fill="rgba(23,23,23,0.5)"
              fontFamily="sans-serif"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** 将探索记录转为 Markdown */
function reportToMarkdown(result: ResearchResult): string {
  let md = `# ${result.query}\n\n`;
  md += `> 知行 · 探索记录 | ${new Date().toISOString().split('T')[0]}\n\n`;

  md += `## 引导摘要\n\n${result.summary}\n\n`;

  if (result.chapters.length > 0) {
    result.chapters.forEach((ch, ci) => {
      md += `## ${ci + 1}. ${ch.title}\n\n`;
      ch.event_indices.forEach((evtIdx) => {
        const evt = result.events[evtIdx];
        if (!evt) return;
        md += `### ${evt.title}\n\n`;
        if (evt.date) md += `**时间：** ${evt.date}  \n\n`;
        md += `${evt.summary}\n\n`;
        if (evt.key_quote) md += `> ${evt.key_quote}\n\n`;
        if (evt.sources.length > 0) {
          md += `**来源：** ${evt.sources.map(s => `[${s.name}](${s.url})`).join('、')}\n\n`;
        }
      });
    });
  }

  if (result.relations.length > 0) {
    md += `## 关联世界\n\n`;
    result.relations.forEach((rel) => {
      const meta = RELATION_META[rel.type] || { label: rel.type, symbol: '?' };
      const from = result.events[rel.from_event_index];
      const to = result.events[rel.to_event_index];
      md += `- ${meta.symbol} ${meta.label}：${from?.title || '?'} → ${to?.title || '?'} — ${rel.description}\n`;
    });
    md += `\n`;
  }

  if (result.insight && result.insight.title) {
    md += `## 行动启发\n\n`;
    md += `### ${result.insight.title}\n\n`;
    if (result.insight.body) md += `${result.insight.body}\n\n`;
    if (result.insight.judgments.length > 0) {
      md += `**关键判断：**\n\n`;
      result.insight.judgments.forEach((j) => { md += `- ${j}\n`; });
      md += `\n`;
    }
    if (Object.keys(result.insight.suggestions).length > 0) {
      md += `**行动建议：**\n\n`;
      Object.entries(result.insight.suggestions).forEach(([role, items]) => {
        md += `**${role}：**\n`;
        items.forEach((s) => { md += `- ${s}\n`; });
        md += `\n`;
      });
    }
  }

  md += `---\n本探索记录由 AI 基于公开搜索结果生成，请结合原始来源核验重要结论。\n`;
  return md;
}

function ReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const [result, setResult] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!query) {
      router.push('/');
      return;
    }
    let cancelled = false;
    let stepTimer: ReturnType<typeof setTimeout>;

    const advanceStep = () => {
      setLoadingStep((prev) => {
        if (prev < LOADING_STEPS.length - 1) {
          stepTimer = setTimeout(advanceStep, 8000 + Math.random() * 6000);
        }
        return prev + 1;
      });
    };
    stepTimer = setTimeout(advanceStep, 6000);

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await research(query);
        if (!cancelled) setResult(data);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : '未知错误';
          setError(`探索失败：${msg}`);
        }
      } finally {
        if (!cancelled) {
          clearTimeout(stepTimer);
          setLoadingStep(LOADING_STEPS.length);
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => {
      cancelled = true;
      clearTimeout(stepTimer);
    };
  }, [query, router]);

  const handleCopy = async () => {
    if (!result) return;
    const md = reportToMarkdown(result);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = md;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportMarkdown = () => {
    if (!result) return;
    const md = reportToMarkdown(result);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `知行_探索记录_${result.query}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (!result) return;
    const data = JSON.stringify(result, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `知行_探索记录_${result.query}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** 加载中 — AI 思考过程 */
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-brand">
          <div className="loading-brand-icon">知</div>
          <span className="loading-brand-text">知行</span>
        </div>
        <div className="loading-query">正在探索「{query}」</div>
        <div className="loading-steps">
          {LOADING_STEPS.map((step, i) => {
            const status = i < loadingStep ? 'done' : i === loadingStep ? 'active' : 'pending';
            return (
              <div key={i} className={`loading-step ${status}`}>
                <div className="loading-step-indicator">
                  {status === 'done' ? (
                    <span className="loading-step-check">✓</span>
                  ) : status === 'active' ? (
                    <span className="loading-step-dot" />
                  ) : (
                    <span className="loading-step-num">{i + 1}</span>
                  )}
                </div>
                <div className="loading-step-content">
                  <span className="loading-step-label">{step.label}</span>
                  <span className="loading-step-desc">{step.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="loading-hint">通常需要 1-3 分钟，AI 正在为你思考</p>
      </div>
    );
  }

  /** 出错 */
  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠</div>
        <p className="error-text">{error}</p>
        <button className="retry-btn" onClick={() => router.push('/')}>返回首页</button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* 左侧边栏 */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">知</div>
          <span className="sidebar-logo-text">知行</span>
        </div>

        <nav className="sidebar-nav">
          <a className="sidebar-nav-item" onClick={() => router.push('/')}>
            <Home size={16} /> 首页
          </a>
          <a className="sidebar-nav-item active">
            <FileText size={16} /> 探索记录
          </a>
        </nav>

        <div style={{ flex: 1 }} />
      </aside>

      {/* 中间阅读区 */}
      <main className="main-content">
        <div className="reading-panel">
          {/* 探索记录头部 */}
          <div className="report-header">
            <p className="report-eyebrow">探索记录</p>
            <h1 className="report-title">{result.query}</h1>
            <div className="report-meta">
              <span>{new Date().toISOString().split('T')[0]}</span>
              <span className="meta-sep" />
              <span>阅读约 {Math.max(1, Math.ceil(result.events.length * 1.5))} 分钟</span>
              <span className="meta-sep" />
              <span>共 {result.events.length} 个知识节点</span>
            </div>
            {result.query_profile && (
              <div className="report-profile-tags">
                <span className="profile-tag">
                  {result.query_profile.display_type}
                </span>
                <span className="profile-tag profile-tag-focus">
                  {result.query_profile.analysis_focus}
                </span>
              </div>
            )}
            <p className="report-disclaimer">
              本探索记录由 AI 基于公开搜索结果生成，请结合原始来源核验重要结论。
            </p>
            {result.warning && (
              <div className="report-warning">
                {result.warning}
              </div>
            )}
          </div>

          <div className="report-divider" />

          {/* 引导摘要 */}
          <section className="report-section">
            <p className="summary-label">引导摘要</p>
            <div className="summary-text">{result.summary}</div>
          </section>

          {/* 知识图谱 */}
          {result.events.length > 1 && (
            <section className="graph-section">
              <div className="graph-header">
                <p className="summary-label" style={{ marginBottom: 0 }}>知识网络</p>
                <span style={{ fontSize: '11px', color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                  {result.events.length} 节点 · {result.relations.length} 连接
                </span>
              </div>
              <KnowledgeGraph events={result.events} relations={result.relations} />
              <div className="graph-legend">
                {Object.entries(RELATION_META).map(([key, meta]) => {
                  const count = result.relations.filter(r => r.type === key).length;
                  if (count === 0) return null;
                  return (
                    <div key={key} className="graph-legend-item">
                      <span className="graph-legend-line" style={{ background: meta.color }} />
                      {meta.symbol} {meta.label}（{count}）
                    </div>
                  );
                })}
                <div className="graph-legend-item">
                  <span className="graph-legend-line" style={{ background: '#8B8378', opacity: 0.5, borderTop: '2px dashed #8B8378' }} />
                  低置信度
                </div>
              </div>
            </section>
          )}

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

                  const outgoing = result.relations.filter(
                    (r) => r.from_event_index === evtIdx && chapter.event_indices.includes(r.to_event_index)
                  );

                  return (
                    <div key={ei} style={{ position: 'relative' }}>
                      <EventCard event={event} num={ei + 1} />

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

                      {event.sources.length > 0 && (
                        <div className="side-note">
                          <p className="side-note-label">来源</p>
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
              <h2 className="chapter-title">关键线索</h2>
              {result.events.map((event, ei) => (
                <div key={ei}>
                  <EventCard event={event} num={ei + 1} />
                  {event.sources.length > 0 && (
                    <div className="side-note">
                      <p className="side-note-label">来源</p>
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

          {/* 关联世界 */}
          {result.relations.length > 0 && (
            <section className="report-section" style={{ marginTop: '48px' }}>
              <p className="summary-label">关联世界</p>
              {result.relations.map((rel, i) => {
                const from = result.events[rel.from_event_index];
                const to = result.events[rel.to_event_index];
                const meta = RELATION_META[rel.type] || { label: rel.type, symbol: '?' };
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
                    <span className="relation-tag" style={{ whiteSpace: 'nowrap' }}>
                      {meta.symbol} {meta.label}
                    </span>
                    <span style={{ fontSize: '14px', color: 'var(--ink-soft)' }}>
                      {from?.title || '?'} <span style={{ color: 'var(--gold)', margin: '0 4px' }}>→</span> {to?.title || '?'}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--taupe)', fontStyle: 'italic', marginLeft: 'auto' }}>
                      {rel.description}
                    </span>
                  </div>
                );
              })}
            </section>
          )}

          {/* 洞察 — 行动启发 */}
          {result.insight && result.insight.title && (
            <section className="insight-section">
              <p className="insight-label">行动启发</p>
              <h3 className="insight-title">{result.insight.title}</h3>
              {result.insight.body && (
                <p className="insight-body">{result.insight.body}</p>
              )}
              {result.insight.judgments.length > 0 && (
                <div className="insight-judgments">
                  {result.insight.judgments.map((j, i) => (
                    <div key={i} className="insight-judgment">
                      <span className="insight-judgment-bullet">◆</span>
                      <span>{j}</span>
                    </div>
                  ))}
                </div>
              )}
              {Object.keys(result.insight.suggestions).length > 0 && (
                <div className="insight-suggestions">
                  {Object.entries(result.insight.suggestions).map(([role, items], i) => (
                    <div key={i} className="insight-suggestion-group">
                      <p className="insight-suggestion-role">{role}</p>
                      {items.map((s, j) => (
                        <div key={j} className="insight-suggestion-item">
                          <span className="insight-suggestion-arrow">→</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 操作区 */}
          <div className="action-section">
            <button className="action-btn action-btn-primary" onClick={handleCopy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '已复制' : '复制 Markdown'}
            </button>
            <button className="action-btn action-btn-outline" onClick={handleExportMarkdown}>
              <Download size={14} /> 导出 .md
            </button>
            <button className="action-btn action-btn-outline" onClick={handleExportJSON}>
              <Code size={14} /> 导出 .json
            </button>
            <button className="action-btn action-btn-outline" onClick={() => router.push('/')}>
              <RotateCcw size={14} /> 重新探索
            </button>
          </div>
        </div>
      </main>

      {/* 右侧目录 */}
      <aside className="right-toc">
        <div className="toc-section">
          <p className="toc-heading">章节</p>
          <div className="toc-links">
            {result.chapters.length > 0 ? (
              result.chapters.map((ch, i) => (
                <button key={i} className="toc-link">{i + 1}. {ch.title}</button>
              ))
            ) : (
              <>
                <button className="toc-link">引导摘要</button>
                <button className="toc-link">知识网络</button>
                <button className="toc-link">关键线索</button>
                {result.insight?.title && <button className="toc-link">行动启发</button>}
              </>
            )}
          </div>
        </div>
        <div className="toc-section">
          <p className="toc-heading">操作</p>
          <div className="toc-actions">
            <button className="toc-action-btn" onClick={handleCopy}>
              {copied ? <Check size={12} /> : <Copy size={12} />} 复制
            </button>
            <button className="toc-action-btn" onClick={handleExportMarkdown}>
              <Download size={12} /> Markdown
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

/** 事件卡片组件 */
function EventCard({ event, num }: { event: EventItem; num: number }) {
  return (
    <div className="event-card">
      <div className="event-num">{String(num).padStart(2, '0')}</div>
      <div className="event-body">
        {event.date && <span className="event-date">{event.date}</span>}
        <h3 className="event-title">{event.title}</h3>
        <p className="event-summary">{event.summary}</p>
        {event.key_quote && (
          <div className="event-quote">"{event.key_quote}"</div>
        )}
        {event.confidence > 0 && (
          <div className="confidence-bar">
            <span className="confidence-label">置信度</span>
            <div className="confidence-track">
              <div className="confidence-fill" style={{ width: `${event.confidence * 100}%` }} />
            </div>
            <span className="confidence-label">{Math.round(event.confidence * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div className="loading-spinner" />
          <span className="loading-text">加载中…</span>
        </div>
      }
    >
      <ReportContent />
    </Suspense>
  );
}

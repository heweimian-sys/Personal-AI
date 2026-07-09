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
import type { ResearchResult, EventItem, Insight } from '@/lib/types';

/** 关系类型 → 中文标签 + 符号 */
const RELATION_META: Record<string, { label: string; symbol: string }> = {
  causal: { label: '因果', symbol: '→' },
  competitive: { label: '竞争', symbol: '↔' },
  contains: { label: '包含', symbol: '⊂' },
  dependency: { label: '依赖', symbol: '⇢' },
  chain: { label: '链式', symbol: '→→' },
};

/** 加载步骤定义 */
const LOADING_STEPS = [
  { label: '搜索全网信息', desc: '抓取多个来源的最新内容' },
  { label: '提取关键事件', desc: 'AI 识别重要事件和时间节点' },
  { label: '分析因果脉络', desc: '梳理事件间的关联关系' },
  { label: '生成深度报告', desc: '组织章节、生成洞察和建议' },
];

/** 将报告转为 Markdown 格式 */
function reportToMarkdown(result: ResearchResult): string {
  let md = `# ${result.query}\n\n`;
  md += `> 知行 · AI 深度调研助手 | ${new Date().toISOString().split('T')[0]}\n\n`;

  md += `## 引导摘要\n\n${result.summary}\n\n`;

  if (result.chapters.length > 0) {
    result.chapters.forEach((ch, ci) => {
      md += `## ${ci + 1}. ${ch.title}\n\n`;
      ch.event_indices.forEach((evtIdx) => {
        const evt = result.events[evtIdx];
        if (!evt) return;
        md += `### ${evt.title}\n\n`;
        if (evt.date) md += `**日期：** ${evt.date}  \n\n`;
        md += `${evt.summary}\n\n`;
        if (evt.key_quote) md += `> ${evt.key_quote}\n\n`;
        if (evt.sources.length > 0) {
          md += `**来源：** ${evt.sources.map(s => `[${s.name}](${s.url})`).join('、')}\n\n`;
        }
      });
    });
  }

  if (result.relations.length > 0) {
    md += `## 关系网络\n\n`;
    result.relations.forEach((rel) => {
      const meta = RELATION_META[rel.type] || { label: rel.type, symbol: '?' };
      const from = result.events[rel.from_event_index];
      const to = result.events[rel.to_event_index];
      md += `- ${meta.symbol} ${meta.label}：${from?.title || '?'} → ${to?.title || '?'} — ${rel.description}\n`;
    });
    md += `\n`;
  }

  if (result.insight && result.insight.title) {
    md += `## 洞察总结\n\n`;
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

  md += `---\n本报告由 AI 基于公开搜索结果生成，请结合原始来源核验重要结论。\n`;
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
          setError(`调研失败：${msg}`);
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

  /** 复制全文 */
  const handleCopy = async () => {
    if (!result) return;
    const md = reportToMarkdown(result);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
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

  /** 导出 Markdown */
  const handleExportMarkdown = () => {
    if (!result) return;
    const md = reportToMarkdown(result);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `知行_${result.query}_报告.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** 导出 JSON（开发用） */
  const handleExportJSON = () => {
    if (!result) return;
    const data = JSON.stringify(result, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `知行_${result.query}_报告.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** 加载中 — 多步骤进度 */
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-brand">
          <div className="loading-brand-icon">知</div>
          <span className="loading-brand-text">知<span className="brand-dot">·</span>行</span>
        </div>
        <div className="loading-query">正在调研「{query}」</div>
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
        <p className="loading-hint">通常需要 1-3 分钟，请耐心等待</p>
      </div>
    );
  }

  /** 出错 */
  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠</div>
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
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">知</div>
          <span className="sidebar-logo-text">知<span className="dot">·</span>行</span>
        </div>

        <nav className="sidebar-nav">
          <a className="sidebar-nav-item" onClick={() => router.push('/')}>
            <Home size={18} /> 首页
          </a>
          <a className="sidebar-nav-item active">
            <FileText size={18} /> 调研报告
          </a>
        </nav>

        <div style={{ flex: 1 }} />
      </aside>

      {/* ===== 中间：阅读区 ===== */}
      <main className="main-content">
        <div className="reading-panel">
          {/* 标题区 */}
          <div className="report-header">
            <h1 className="report-title">{result.query}</h1>
            <div className="report-meta">
              <span className="section-eyebrow">知行 · AI 深度调研助手</span>
              <span className="meta-sep" />
              <span className="section-eyebrow">{new Date().toISOString().split('T')[0]}</span>
              <span className="meta-sep" />
              <span className="section-eyebrow">阅读约 {Math.max(1, Math.ceil(result.events.length * 1.5))} 分钟</span>
            </div>
            {/* 可信度提示 */}
            <p className="report-disclaimer">
              本报告由 AI 基于公开搜索结果生成，请结合原始来源核验重要结论。
            </p>
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

                  const outgoing = result.relations.filter(
                    (r) => r.from_event_index === evtIdx && chapter.event_indices.includes(r.to_event_index)
                  );

                  return (
                    <div key={ei} style={{ position: 'relative' }}>
                      <EventCard event={event} />

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

          {/* 操作区 — 主按钮 */}
          <div className="action-section">
            <button
              className="action-btn action-btn-primary"
              onClick={handleCopy}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '已复制' : '复制全文'}
            </button>
            <button
              className="action-btn action-btn-outline"
              onClick={handleExportMarkdown}
            >
              <Download size={16} /> 导出 Markdown
            </button>
            <button
              className="action-btn action-btn-outline"
              onClick={() => router.push('/')}
            >
              <RotateCcw size={16} /> 重新调研
            </button>
          </div>
        </div>
      </main>

      {/* ===== 右侧目录 ===== */}
      <aside className="right-toc">
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

        {/* 操作按钮 — JSON 降级为开发按钮 */}
        <div className="toc-actions">
          <button className="toc-action-btn toc-action-dev" onClick={handleExportJSON}>
            <Code size={14} /> 导出 JSON（开发）
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
      {/* 置信度条 — 加 title 说明 */}
      <div className="confidence-bar" title="置信度表示 AI 对该事件可靠性的估计，不代表事实绝对准确。">
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

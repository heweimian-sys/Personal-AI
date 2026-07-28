'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Compass,
  FilePenLine,
  Layers3,
  Network,
  Search,
  Sparkles,
  Timer,
} from 'lucide-react';
import type { ResearchMode } from '@/lib/types';

const SUGGESTIONS = [
  { word: 'AI Agent', hint: '趋势、产品与商业化' },
  { word: '小红书电商', hint: '平台、商家与机会' },
  { word: '低空经济', hint: '政策、产业链与城市' },
  { word: '具身智能', hint: '机器人、数据与场景' },
  { word: '新能源汽车出海', hint: '市场、竞品与风险' },
  { word: '短剧行业', hint: '内容、流量与变现' },
];

const MODE_META: Record<
  ResearchMode,
  {
    num: string;
    title: string;
    desc: string;
    verb: string;
    accent: string;
    icon: typeof Compass;
    output: string;
    rhythm: string;
  }
> = {
  explore: {
    num: '01',
    title: '探索',
    desc: '把陌生话题整理成脉络、证据、关系和判断。',
    verb: '生成报告',
    accent: '#2d7dd2',
    icon: Compass,
    output: '深度调研',
    rhythm: '报告约 6 分钟',
  },
  create: {
    num: '02',
    title: '创作',
    desc: '把选题拆成角度、论点、素材和内容提纲。',
    verb: '生成角度',
    accent: '#e05a8a',
    icon: FilePenLine,
    output: '选题角度',
    rhythm: '角度 12 条',
  },
  work: {
    num: '03',
    title: '工作',
    desc: '快速获得行业判断、竞品线索、风险清单和会议要点。',
    verb: '开始研判',
    accent: '#2f9b72',
    icon: BriefcaseBusiness,
    output: '决策简报',
    rhythm: '重点 5 项',
  },
};

const SIGNALS = [
  { label: '可信来源', value: '多源交叉核验' },
  { label: '关系分析', value: '因果 / 竞争 / 依赖' },
  { label: '最终输出', value: '报告 + 图谱 + 行动建议' },
];

const NODE_LABELS = ['起点', '人物', '事件', '观点', '证据', '机会', '风险'];

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<ResearchMode>('explore');
  const [loading, setLoading] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(SUGGESTIONS[0].word);
  const [hoveredNode, setHoveredNode] = useState('起点');
  const inputRef = useRef<HTMLInputElement>(null);

  const meta = MODE_META[mode];
  const ModeIcon = meta.icon;
  const activePrompt = query.trim() || activeSuggestion;

  const nodeItems = useMemo(
    () =>
      NODE_LABELS.map((label, index) => ({
        label,
        x: 12 + ((index * 19) % 76),
        y: 18 + ((index * 31) % 62),
      })),
    []
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty('--mx', `${event.clientX}px`);
    event.currentTarget.style.setProperty('--my', `${event.clientY}px`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextQuery = query.trim() || activeSuggestion;
    if (!nextQuery) return;
    setLoading(true);
    router.push(`/report?q=${encodeURIComponent(nextQuery)}&mode=${mode}`);
  };

  const selectSuggestion = (word: string) => {
    setActiveSuggestion(word);
    setQuery(word);
    inputRef.current?.focus();
  };

  return (
    <div
      className="home-page"
      style={{ '--mode-accent': meta.accent } as React.CSSProperties}
      onPointerMove={handlePointerMove}
    >
      <div className="home-grid-layer" />
      <div className="home-scanline" />

      <header className="home-header">
        <button type="button" className="home-logo" aria-label="知行首页">
          <div className="logo-mark">知</div>
          <span className="logo-text">知行</span>
        </button>
        <nav className="home-nav" aria-label="主要导航">
          <button className="nav-link" type="button" onClick={() => router.push('/history')}>历史</button>
          <button className="nav-link" type="button" onClick={() => router.push('/dashboard')}>工作台</button>
          <button className="nav-link" type="button" onClick={() => window.location.href = 'mailto:feedback@example.com'}>反馈</button>
        </nav>
      </header>

      <main className="home-shell">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="hero-kicker-row">
            <span className="hero-eyebrow">ZHI · XING</span>
            <span className="hero-live-pill">
              <Sparkles size={14} />
              {meta.output}
            </span>
          </div>

          <h1 id="home-title" className="hero-title">
            <span>输入一个词，</span>
            <span>生成一篇</span>
            <span className="hero-title-accent">深度调研报告。</span>
          </h1>

          <p className="hero-subtitle">
            知行会把公开信息整理成脉络、证据、因果关系和下一步行动建议，适合快速了解行业、竞品、热点与选题。
          </p>

          <form className="search-box" onSubmit={handleSubmit}>
            <Search size={20} className="search-icon" />
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="输入一个行业、竞品、热点或选题"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              aria-label="搜索关键词"
            />
            <button type="submit" className="search-btn" disabled={loading}>
              <ModeIcon size={17} />
              {loading ? '生成中' : meta.verb}
            </button>
          </form>

          <div className="suggestions" aria-label="推荐探索词">
            {SUGGESTIONS.map((item) => (
              <button
                key={item.word}
                type="button"
                className={`suggestion-chip ${activeSuggestion === item.word ? 'active' : ''}`}
                onClick={() => selectSuggestion(item.word)}
              >
                <span>{item.word}</span>
                <small>{item.hint}</small>
              </button>
            ))}
          </div>
        </section>

        <aside className="home-preview" aria-label="探索预览">
          <div className="preview-header">
            <div>
              <span className="preview-label">当前输入</span>
              <h2>{activePrompt}</h2>
            </div>
            <span className="preview-mode">{meta.title}</span>
          </div>

          <div className="knowledge-map" aria-label="知识节点预览">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline points="12,46 31,18 50,80 69,49 88,24" />
              <polyline points="12,46 50,80 88,24" />
            </svg>
            {nodeItems.map((node) => (
              <button
                key={node.label}
                type="button"
                className={`map-node ${hoveredNode === node.label ? 'active' : ''}`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                onMouseEnter={() => setHoveredNode(node.label)}
                onFocus={() => setHoveredNode(node.label)}
              >
                {node.label}
              </button>
            ))}
            <div className="map-caption">
              <Network size={15} />
              正在聚焦：{hoveredNode}
            </div>
          </div>

          <div className="preview-signals">
            {SIGNALS.map((signal) => (
              <div key={signal.label} className="signal-item">
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
              </div>
            ))}
          </div>
        </aside>
      </main>

      <section className="home-modes" aria-label="研究模式">
        {Object.entries(MODE_META).map(([key, item]) => {
          const Icon = item.icon;
          const isActive = key === mode;
          return (
            <button
              key={key}
              type="button"
              className={`mode-card ${isActive ? 'active' : ''}`}
              onClick={() => setMode(key as ResearchMode)}
              aria-pressed={isActive}
              style={{ '--card-accent': item.accent } as React.CSSProperties}
            >
              <span className="mode-num">{item.num}</span>
              <span className="mode-icon"><Icon size={18} /></span>
              <span className="mode-title">{item.title}</span>
              <span className="mode-desc">{item.desc}</span>
              <span className="mode-meta">
                <Timer size={14} />
                {item.rhythm}
              </span>
            </button>
          );
        })}
      </section>

      <footer className="home-footer">
        <span className="footer-text">
          <Layers3 size={13} /> 知行 · 一个词生成一篇深度调研
        </span>
        <span className="footer-text">
          2026 <ArrowUpRight size={13} />
        </span>
      </footer>
    </div>
  );
}

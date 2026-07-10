'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';

const SUGGESTIONS = ['你好', '月亮', '唐朝', '内卷', 'AI Agent'];

const MODES = [
  { num: '01', title: '探索', desc: '发现一个词背后的世界' },
  { num: '02', title: '分析', desc: '拆解一个产品、行业、趋势' },
  { num: '03', title: '创造', desc: '生成内容、文章、选题' },
  { num: '04', title: '行动', desc: '把想法变成计划' },
];

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (inputRef.current as HTMLInputElement | null)?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    router.push(`/report?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="home-page">
      {/* 背景柔光 */}
      <div className="home-bg-glow home-bg-glow-1" />
      <div className="home-bg-glow home-bg-glow-2" />

      {/* 顶部导航 */}
      <header className="home-header">
        <div className="home-logo">
          <div className="logo-mark">知</div>
          <span className="logo-text">知行</span>
        </div>
        <nav className="home-nav">
          <span className="nav-link">探索</span>
          <span className="nav-link">关于</span>
          <span className="nav-link">GitHub</span>
        </nav>
      </header>

      {/* Hero 区 */}
      <main className="home-hero">
        <p className="hero-eyebrow">ZHI · XING</p>
        <h1 className="hero-title">
          <span className="hero-title-line">给我一个词</span>
          <span className="hero-title-line">我带你看见</span>
          <span className="hero-title-line">它背后的<span className="hero-title-accent">世界</span></span>
        </h1>
        <p className="hero-subtitle">
          <span>不是搜索，是探索</span>·
          <span>不是信息，是认知</span>·
          <span>不是答案，是视角</span>
        </p>

        {/* 搜索框 */}
        <div className="search-area">
          <form className="search-box" onSubmit={handleSubmit}>
            <Search size={18} className="search-icon" />
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="你想了解什么？"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              aria-label="搜索关键词"
            />
            <button
              type="submit"
              className="search-btn"
              disabled={loading || !query.trim()}
            >
              {loading ? '探索中…' : '探索 →'}
            </button>
          </form>

          {/* 推荐探索词 — [[双链]] 样式 */}
          <div className="suggestions">
            {SUGGESTIONS.map((word) => (
              <span
                key={word}
                className="suggestion-chip"
                onClick={() => {
                  setQuery(word);
                  router.push(`/report?q=${encodeURIComponent(word)}`);
                }}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* 底部四入口 */}
      <div className="home-modes">
        {MODES.map((mode) => (
          <div key={mode.num} className="mode-card">
            <p className="mode-num">{mode.num}</p>
            <h3 className="mode-title">{mode.title}</h3>
            <p className="mode-desc">{mode.desc}</p>
            <span className="mode-arrow">↓</span>
          </div>
        ))}
      </div>

      {/* 页脚 */}
      <footer className="home-footer">
        <span className="footer-text">知行 · 给我一个词，我带你看见它背后的世界</span>
        <span className="footer-text">2026</span>
      </footer>
    </div>
  );
}

'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const SUGGESTIONS = ['你好', '月亮', '唐朝', '内卷', 'AI Agent'];

const MODES = [
  { num: '01', title: '探索', desc: '发现一个词背后的世界' },
  { num: '02', title: '分析', desc: '拆解一个产品、行业、趋势' },
  { num: '03', title: '创造', desc: '生成内容、文章、选题' },
  { num: '04', title: '行动', desc: '把想法变成计划' },
];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/report?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSuggestion = (text: string) => {
    router.push(`/report?q=${encodeURIComponent(text)}`);
  };

  return (
    <main className="home-page">
      {/* 背景柔光 */}
      <div className="home-bg-glow home-bg-glow-1" />
      <div className="home-bg-glow home-bg-glow-2" />

      {/* 顶部导航 */}
      <header className="home-header">
        <div className="home-logo">
          <span className="logo-mark">知</span>
          <span className="logo-text">知行</span>
        </div>
        <nav className="home-nav">
          <a className="nav-link" onClick={() => router.push('/')}>探索</a>
          <a className="nav-link">记录</a>
          <a className="nav-link">关于</a>
        </nav>
      </header>

      {/* Hero 主视觉 */}
      <section className="home-hero">
        <h1 className="hero-title">
          <span className="hero-title-line">给我一个词</span>
          <span className="hero-title-line">我带你看见</span>
          <span className="hero-title-line hero-title-accent">它背后的世界</span>
        </h1>
        <p className="hero-subtitle">
          <span>探索一个概念</span>·<span>理解一个行业</span>·<span>发现一个问题的新视角</span>
        </p>

        {/* 搜索框 */}
        <div className="search-area">
          <form onSubmit={handleSubmit}>
            <div className="search-box">
              <span className="search-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="14" y1="14" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="text"
                className="search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="你想了解什么？"
                autoFocus
              />
              <button
                type="submit"
                className="search-btn"
                disabled={!query.trim()}
              >
                开始探索 →
              </button>
            </div>
          </form>

          {/* 推荐探索词 */}
          <div className="suggestions">
            {SUGGESTIONS.map((word) => (
              <span
                key={word}
                className="suggestion-chip"
                onClick={() => handleSuggestion(word)}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 底部四入口 */}
      <section className="home-modes">
        {MODES.map((mode) => (
          <div
            key={mode.num}
            className="mode-card"
            onClick={() => (document.querySelector('.search-input') as HTMLInputElement)?.focus()}
          >
            <p className="mode-num">{mode.num}</p>
            <h3 className="mode-title">{mode.title}</h3>
            <p className="mode-desc">{mode.desc}</p>
            <span className="mode-arrow">↓</span>
          </div>
        ))}
      </section>

      {/* 页脚 */}
      <footer className="home-footer">
        <span className="footer-text">知行 — 一个帮助人理解世界、连接知识、产生行动的 AI 探索平台</span>
        <span className="footer-text">© 2026</span>
      </footer>
    </main>
  );
}

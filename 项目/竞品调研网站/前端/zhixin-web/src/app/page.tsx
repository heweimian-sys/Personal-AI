'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const SUGGESTIONS = [
  { text: '你好', desc: '日常词语', type: 'daily_word' },
  { text: '月亮', desc: '抽象概念', type: 'abstract_concept' },
  { text: '唐朝', desc: '历史主题', type: 'history' },
  { text: '地中海', desc: '地理空间', type: 'geography' },
  { text: '内卷', desc: '社会现象', type: 'social_phenomenon' },
  { text: 'AI Agent 工具市场', desc: '科技商业', type: 'tech_business' },
  { text: '为什么年轻人焦虑？', desc: '问题研究', type: 'question' },
];

const STEPS = [
  { num: '01', title: 'SEARCH', cn: '搜索', desc: '输入任意主题，全网抓取信息' },
  { num: '02', title: 'DECODE', cn: '拆解', desc: 'AI 提取关键线索和知识节点' },
  { num: '03', title: 'CONNECT', cn: '连接', desc: '梳理因果脉络和关联关系' },
  { num: '04', title: 'INSIGHT', cn: '洞察', desc: '生成行动建议和深度判断' },
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
      {/* ── 顶部导航栏 ── */}
      <header className="home-topbar">
        <div className="topbar-brand">
          <span className="brand-mark">知</span>
          <span className="brand-name">ZHI XING.</span>
        </div>
        <nav className="topbar-nav">
          <a className="topbar-link" href="#hero">MANIFESTO</a>
          <a className="topbar-link" href="#suggestions">EXAMPLES</a>
          <a
            className="topbar-link topbar-link-accent"
            onClick={() => (document.querySelector('.search-input') as HTMLInputElement)?.focus()}
          >
            START →
          </a>
        </nav>
      </header>

      {/* ── Hero 大标题 ── */}
      <section className="home-hero" id="hero">
        <h1 className="hero-title">
          A DIFFERENT<br />
          WAY TO<br />
          UNDERSTAND<br />
          <span className="hero-accent">ANYTHING.</span>
        </h1>
        <p className="hero-subtitle">
          给我一个词，我帮你看到它背后的世界。
        </p>
      </section>

      {/* ── 搜索区 ── */}
      <section className="home-search">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-line">
            <span className="search-prefix">INPUT_</span>
            <input
              type="text"
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入任意词语、问题、人物、地点或现象..."
              autoFocus
            />
            <button
              type="submit"
              className="search-btn"
              disabled={!query.trim()}
            >
              EXPLORE →
            </button>
          </div>
        </form>
      </section>

      {/* ── 流程步骤 ── */}
      <section className="home-process">
        {STEPS.map((step) => (
          <div key={step.num} className="process-item">
            <span className="process-num">{step.num}</span>
            <span className="process-title">{step.title}</span>
            <span className="process-cn">{step.cn}</span>
            <span className="process-desc">{step.desc}</span>
          </div>
        ))}
      </section>

      {/* ── 推荐探索 ── */}
      <section className="home-suggestions" id="suggestions">
        <p className="suggestions-label">RECENT EXPLORATIONS / 推荐探索</p>
        <div className="suggestions-grid">
          {SUGGESTIONS.map((item) => (
            <div
              key={item.text}
              className="suggestion-item"
              onClick={() => handleSuggestion(item.text)}
            >
              <span className="suggestion-dot" data-type={item.type} />
              <span className="suggestion-text">{item.text}</span>
              <span className="suggestion-type">{item.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 底部 ── */}
      <footer className="home-footer">
        <span className="footer-label">ZHI XING · COGNITIVE EXPLORATION STUDIO</span>
        <span className="footer-copy">© 2026</span>
      </footer>
    </main>
  );
}

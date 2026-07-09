'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

/** 推荐搜索词 */
const SUGGESTIONS = [
  { text: 'AI行业', desc: '技术趋势' },
  { text: '新能源政策', desc: '政策解读' },
  { text: '半导体产业链', desc: '产业分析' },
  { text: '美食文化', desc: '文化探索' },
];

/**
 * 搜索入口页 — 知行 · 信息追踪平台
 * 水墨风首页：品牌标识 + 搜索区 + 三步流程 + 推荐标签
 */
export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  /** 提交搜索 */
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/report?q=${encodeURIComponent(trimmed)}`);
  };

  /** 点击推荐标签 */
  const handleSuggestion = (text: string) => {
    setQuery(text);
    router.push(`/report?q=${encodeURIComponent(text)}`);
  };

  return (
    <main className="search-page">
      {/* 背景装饰 */}
      <div className="search-hero-bg" />
      <div className="search-hero-bg-2" />

      {/* 顶部品牌栏 */}
      <header className="brand-bar">
        <div className="brand-logo">知</div>
        <span className="brand-name">知<span className="brand-dot">·</span>行</span>
      </header>

      {/* 主体内容 */}
      <div className="search-content">
        {/* 标题区 */}
        <h1 className="search-hero-title">
          知<span className="title-accent">·</span>行
        </h1>
        <p className="search-hero-subtitle">消除信息差 · 从知道到做到</p>
        <p className="search-hero-desc">
          输入任意关键词，AI 自动搜索全网信息，提取关键事件，分析因果脉络，生成可阅读的深度报告
        </p>

        {/* 搜索框 */}
        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-input-group">
            <input
              type="text"
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入关键词，如：AI 行业趋势 / 深圳经济政策 / 竞品动态..."
              autoFocus
            />
            <button
              type="submit"
              className="search-btn"
              disabled={!query.trim()}
            >
              搜 索
            </button>
          </div>
        </form>

        {/* 推荐标签 */}
        <div className="search-suggestions">
          <span className="suggestion-label">试试搜索</span>
          <div className="suggestion-tags">
            {SUGGESTIONS.map((item) => (
              <span
                key={item.text}
                className="suggestion-tag"
                onClick={() => handleSuggestion(item.text)}
              >
                <span className="suggestion-tag-text">{item.text}</span>
                <span className="suggestion-tag-desc">{item.desc}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 三步流程 */}
      <section className="how-it-works">
        <div className="step-item">
          <div className="step-number">壹</div>
          <h3 className="step-title">搜索</h3>
          <p className="step-desc">输入关键词<br/>全网信息实时抓取</p>
        </div>
        <div className="step-arrow">→</div>
        <div className="step-item">
          <div className="step-number">贰</div>
          <h3 className="step-title">分析</h3>
          <p className="step-desc">AI 提取事件<br/>梳理因果脉络</p>
        </div>
        <div className="step-arrow">→</div>
        <div className="step-item">
          <div className="step-number">叁</div>
          <h3 className="step-title">洞察</h3>
          <p className="step-desc">生成深度报告<br/>从知道到做到</p>
        </div>
      </section>

      {/* 底部 */}
      <footer className="search-footer">
        <span className="footer-ornament">◇ ◆ ◇</span>
        <p className="footer-text">知行 · 让信息像好文章一样自然流入大脑</p>
      </footer>
    </main>
  );
}
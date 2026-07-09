'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

/** 推荐搜索词 — 更贴近真实用户场景 */
const SUGGESTIONS = [
  { text: 'AI Agent 工具市场', desc: '行业趋势' },
  { text: 'Dify 和 Coze 竞品分析', desc: '竞品调研' },
  { text: '飞书知识库机器人', desc: '产品机会' },
  { text: '小红书 AI 运营工具', desc: '创业选题' },
  { text: '跨境电商 AI 工具', desc: '市场分析' },
];

/** 适用人群 */
const AUDIENCES = ['创业者', '产品经理', '运营', '自媒体选题'];

/**
 * 搜索入口页 — 知行 · AI 深度调研助手
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
        <p className="search-hero-subtitle">AI 深度调研助手</p>
        <p className="search-hero-desc">
          输入一个行业、产品、公司或趋势关键词，自动生成带时间线、因果关系和行动建议的调研报告
        </p>

        {/* 搜索框 */}
        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-input-group">
            <input
              type="text"
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入关键词，如：AI Agent 工具市场 / Dify 和 Coze 竞品分析..."
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

        {/* 适用人群 */}
        <div className="search-audience">
          <span className="audience-label">适合：</span>
          {AUDIENCES.map((role, i) => (
            <span key={role} className="audience-tag">
              {role}{i < AUDIENCES.length - 1 && <span className="audience-sep"> ·</span>}
            </span>
          ))}
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
        <p className="footer-text">知行 · AI 深度调研助手 · 从信息搜索，到因果分析，再到行动建议</p>
      </footer>
    </main>
  );
}

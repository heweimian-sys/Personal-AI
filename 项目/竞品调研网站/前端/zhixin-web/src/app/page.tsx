'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

/** 推荐搜索词 */
const SUGGESTIONS = [
  'AI行业',
  '新能源政策',
  '半导体产业链',
  '美食文化',
];

/** 时间范围选项 */
const TIME_RANGES = ['最近一天', '最近一周', '最近一月', '最近一年'];

/**
 * 搜索入口页 — 知行 · 信息追踪平台
 * 装饰双框搜索盒 + 时间范围 + 推荐标签
 */
export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeRange, setActiveRange] = useState('最近一月');

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
      <div className="search-hero-bg" />

      <div className="search-content">
        {/* 标题 */}
        <h1 className="search-hero-title">
          知<span className="accent">·</span>行
        </h1>
        <p className="search-hero-subtitle">
          消除信息差 · 从知道到做到
        </p>

        {/* 搜索框 — 装饰双框 */}
        <form onSubmit={handleSubmit}>
          <div className="search-box-wrapper">
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
            <div className="time-range-group">
              {TIME_RANGES.map((range) => (
                <span
                  key={range}
                  className={`time-chip ${activeRange === range ? 'active' : ''}`}
                  onClick={() => setActiveRange(range)}
                >
                  {range}
                </span>
              ))}
            </div>
          </div>
        </form>

        {/* 推荐标签 */}
        <div className="search-suggestions">
          {SUGGESTIONS.map((text) => (
            <span
              key={text}
              className="suggestion-tag"
              onClick={() => handleSuggestion(text)}
            >
              {text}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}

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

/**
 * 搜索入口页
 * 居中搜索框 + 推荐标签，输入关键词后跳转到 /report?q=xxx
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
      <div className="search-hero" />

      <div className="search-content">
        {/* 标题 */}
        <h1 className="search-title">
          让调研<br />像呼吸一样自然
        </h1>
        <p className="search-subtitle">
          知信帮你把碎片信息变成可阅读的深度认知
        </p>

        {/* 搜索框 */}
        <form onSubmit={handleSubmit}>
          <div className="search-box">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入关键词，开始深度调研..."
              autoFocus
            />
            <button
              type="submit"
              className="search-btn"
              disabled={!query.trim()}
            >
              检索
            </button>
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

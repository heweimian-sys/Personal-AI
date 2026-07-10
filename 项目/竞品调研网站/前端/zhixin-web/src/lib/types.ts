/**
 * 知行 · AI 深度调研助手 — 前端类型定义
 * 与后端 API 返回结构一一对应
 */

/** 信息来源 */
export interface Source {
  name: string;
  url: string;
}

/** 事件项 */
export interface EventItem {
  title: string;
  summary: string;
  date: string | null;
  sources: Source[];
  key_quote: string | null;
  confidence: number;
}

/** 关系类型 */
export type RelationType = 'causal' | 'competitive' | 'contains' | 'dependency' | 'chain';

/** 关系 */
export interface Relation {
  from_event_index: number;
  to_event_index: number;
  type: RelationType;
  description: string;
  confidence: number;
}

/** 章节 */
export interface Chapter {
  title: string;
  event_indices: number[];
}

/** AI 洞察 */
export interface Insight {
  title: string;
  body: string;
  judgments: string[];
  suggestions: Record<string, string[]>;
}

/** 查询画像 — 描述查询的分类与重写信息 */
export interface QueryProfile {
  original_query: string;
  topic_type: string;
  template: string;
  rewritten_query: string;
  analysis_focus: string;
  tone: string;
  display_type: string;
  confidence: number;
  classified_by: string;
}

/** 研究结果 */
export interface ResearchResult {
  query: string;
  summary: string;
  events: EventItem[];
  relations: Relation[];
  chapters: Chapter[];
  insight: Insight | null;
  query_profile?: QueryProfile;
  source_status?: 'real' | 'fallback' | 'mock';
  warning?: string | null;
}

/** 研究请求 */
export interface ResearchRequest {
  query: string;
  search_limit?: number;
  max_events?: number;
}

/**
 * 知信 · 认知加速器 — 前端类型定义
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

/** 研究结果 */
export interface ResearchResult {
  query: string;
  summary: string;
  events: EventItem[];
  relations: Relation[];
  chapters: Chapter[];
}

/** 研究请求 */
export interface ResearchRequest {
  query: string;
  search_limit?: number;
  max_events?: number;
}

/**
 * 知行 · AI 深度调研助手 — 前端类型定义
 * 与后端 API 返回结构一一对应
 */

/** 信息来源 */
export interface Source {
  name: string;
  url: string;
  published_at?: string | null;
  supports?: string;
  type?: 'official' | 'academic' | 'primary' | 'media' | 'web' | string;
  credibility?: 'high' | 'medium' | 'low' | string;
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

export type ResearchMode = 'create' | 'work' | 'explore';

export interface ModeReportSection {
  title: string;
  body: string;
  bullets: string[];
  evidence_indices: number[];
  source_refs: Source[];
}

export interface ModeReport {
  mode: ResearchMode;
  title: string;
  sections: ModeReportSection[];
  source_notes: string[];
}

export interface SourceSummary {
  total: number;
  with_url: number;
  with_date: number;
  high_credibility: number;
  medium_credibility: number;
  unsupported_events: string[];
  notes: string[];
}

/** 历史报告列表项 */
export interface ReportSummaryItem {
  id: number;
  query: string;
  summary: string;
  generated_at: string | null;
  event_count: number;
  relation_count: number;
  chapter_count: number;
  insight_title: string | null;
}

/** Dashboard 汇总数据 */
export interface DashboardStats {
  total_reports: number;
  total_events: number;
  total_relations: number;
  total_insights: number;
  latest_reports: ReportSummaryItem[];
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
  report_id?: number;
  query: string;
  mode?: ResearchMode;
  summary: string;
  events: EventItem[];
  relations: Relation[];
  chapters: Chapter[];
  mode_report?: ModeReport | null;
  insight: Insight | null;
  query_profile?: QueryProfile;
  source_summary?: SourceSummary;
  source_status?: 'real' | 'fallback' | 'mock' | 'saved';
  warning?: string | null;
  generated_at?: string | null;
}

/** 研究请求 */
export interface ResearchRequest {
  query: string;
  mode?: ResearchMode;
  search_limit?: number;
  max_events?: number;
}

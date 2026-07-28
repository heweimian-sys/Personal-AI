/**
 * 知行 · AI 深度调研助手 — API 客户端
 * 封装与后端 FastAPI 的所有 HTTP 通信
 * 当后端不可用时，自动降级到 Mock 数据
 */

import axios from 'axios';
import type { DashboardStats, ReportSummaryItem, ResearchMode, ResearchResult } from './types';
import { getMockReport } from './mock';

/**
 * 后端 API 基础地址
 * - 本地开发：留空 → 使用相对路径 /api/xxx，由 next.config.ts rewrite 到 localhost:8000
 * - Vercel 部署：留空 → 使用相对路径 /api/xxx，由 next.config.ts rewrite 到 Railway 后端
 * - 直连模式：设置 NEXT_PUBLIC_API_URL=https://your-backend.com → 跳过 rewrite 直连
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/** axios 实例（3 分钟超时，适应 AI 多步分析耗时） */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * 发起研究请求
 * 当后端不可用时，自动降级到 Mock 数据（方便前端独立演示）
 * @param query 查询关键词
 * @returns 研究结果（事件、关系、章节、摘要、洞察）
 */
export async function research(query: string, mode: ResearchMode = 'explore'): Promise<ResearchResult> {
  try {
    const response = await api.post('/api/research', {
      query,
      mode,
      search_limit: 10,
      max_events: 8,
    });
    return response.data as ResearchResult;
  } catch (err) {
    // 后端不可用或请求失败时，降级到 Mock 数据
    console.warn('[知行] 后端服务不可用，使用 Mock 数据展示。', err);
    const mock = getMockReport(mode);
    return {
      ...mock,
      query,
      mode,
      source_status: 'mock',
      warning: '当前为演示数据（后端服务未启动）。启动后端后可获得真实搜索结果。',
    } as ResearchResult;
  }
}

/** 获取历史报告列表 */
export async function listReports(limit = 30): Promise<ReportSummaryItem[]> {
  try {
    const response = await api.get('/api/reports', { params: { limit } });
    return response.data?.items || [];
  } catch (err) {
    console.warn('[知行] 获取历史报告失败。', err);
    return [];
  }
}

/** 获取历史报告详情 */
export async function getReport(id: number): Promise<ResearchResult> {
  const response = await api.get(`/api/reports/${id}`);
  return response.data as ResearchResult;
}

/** 删除历史报告 */
export async function deleteReport(id: number): Promise<boolean> {
  try {
    await api.delete(`/api/reports/${id}`);
    return true;
  } catch (err) {
    console.warn('[知行] 删除历史报告失败。', err);
    return false;
  }
}

/** 获取 Dashboard 统计 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const response = await api.get('/api/dashboard');
    return response.data as DashboardStats;
  } catch (err) {
    console.warn('[知行] 获取 Dashboard 失败。', err);
    return {
      total_reports: 0,
      total_events: 0,
      total_relations: 0,
      total_insights: 0,
      latest_reports: [],
    };
  }
}

/**
 * 健康检查
 * @returns 后端是否正常运行
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await api.get('/api/health');
    return response.data?.status === 'ok';
  } catch {
    return false;
  }
}

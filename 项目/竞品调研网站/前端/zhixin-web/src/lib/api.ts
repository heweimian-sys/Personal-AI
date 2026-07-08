/**
 * 知信 · 认知加速器 — API 客户端
 * 封装与后端 FastAPI 的所有 HTTP 通信
 */

import axios from 'axios';
import type { ResearchResult } from './types';

/** 后端 API 基础地址（支持环境变量覆盖） */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** axios 实例（120 秒超时，适应 AI 分析耗时） */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * 发起研究请求
 * @param query 查询关键词
 * @returns 研究结果（事件、关系、章节、摘要）
 */
export async function research(query: string): Promise<ResearchResult> {
  const response = await api.post('/api/research', {
    query,
    search_limit: 10,
    max_events: 8,
  });
  return response.data as ResearchResult;
}

/**
 * 健康检查
 * @returns 后端是否正常运行
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await api.get('/health');
    return response.data?.status === 'ok';
  } catch {
    return false;
  }
}

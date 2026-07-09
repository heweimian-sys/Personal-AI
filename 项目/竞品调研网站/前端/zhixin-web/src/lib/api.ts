/**
 * 知信 · 认知加速器 — API 客户端
 * 封装与后端 FastAPI 的所有 HTTP 通信
 * 当后端不可用时，自动降级到 Mock 数据
 */

import axios from 'axios';
import type { ResearchResult } from './types';
import { MOCK_REPORT } from './mock';

/** 后端 API 基础地址（支持环境变量覆盖） */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** axios 实例（5 分钟超时，适应 AI 多步分析耗时） */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * 发起研究请求
 * 当后端不可用时，自动降级到 Mock 数据（方便前端独立演示）
 * @param query 查询关键词
 * @returns 研究结果（事件、关系、章节、摘要、洞察）
 */
export async function research(query: string): Promise<ResearchResult> {
  try {
    const response = await api.post('/api/research', {
      query,
      search_limit: 10,
      max_events: 8,
    });
    return response.data as ResearchResult;
  } catch (err) {
    // 后端不可用时，降级到 Mock 数据
    if (err instanceof Error && (err.message.includes('ECONNREFUSED') || err.message.includes('Network Error'))) {
      console.warn('[知信] 后端服务未启动，使用 Mock 数据展示。请启动后端：cd 后端 && uvicorn app.main:app --reload');
      // 返回 Mock 数据，但替换查询词
      return { ...MOCK_REPORT, query } as ResearchResult;
    }
    throw err;
  }
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

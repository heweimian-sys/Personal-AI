/**
 * 知信 · 认知加速器 — Mock 数据
 * 当后端服务未启动时，前端自动降级展示样例报告
 * 方便前端独立开发和演示
 */

import type { ResearchResult } from './types';

/** 样例报告：AI 行业 */
export const MOCK_REPORT: ResearchResult = {
  query: 'AI行业',
  summary:
    '过去一年，大模型竞争焦点从参数规模转向多模态能力和成本效率。Claude 4 的发布标志着模型层趋同化加速，GPU 供需矛盾推动端侧 AI 芯片发展。AI Agent 作为连接模型和用户的新层，正在成为下一个增长点。',
  events: [
    {
      title: 'Claude 4 发布',
      summary:
        'Anthropic 发布 Claude 4，在多模态基准测试中超越所有竞争对手。新模型支持图像理解、代码生成和长文本推理，推理成本降低 60%。',
      date: '2024-03-15',
      sources: [
        { name: 'Anthropic 官方', url: 'https://example.com/1' },
        { name: 'TechCrunch', url: 'https://example.com/2' },
      ],
      key_quote: 'Claude 4 在多模态基准测试中超越了所有竞争对手，推理成本降低 60%。',
      confidence: 0.9,
    },
    {
      title: 'OpenAI 加速 GPT-5 开发',
      summary:
        '受 Claude 4 发布的竞争压力影响，OpenAI 加速 GPT-5 开发。预计将在今年晚些时候发布，重点提升多模态能力和推理效率。',
      date: '2024-04-01',
      sources: [{ name: 'Reuters', url: 'https://example.com/3' }],
      key_quote: 'GPT-5 预计将在今年晚些时候发布，重点提升多模态能力。',
      confidence: 0.75,
    },
    {
      title: 'AI 芯片需求激增',
      summary:
        '大模型竞争推动 GPU 需求激增，NVIDIA H100 价格上涨 40%。供需矛盾预计将持续到 2025 年，推动端侧 AI 芯片加速发展。',
      date: '2024-05-01',
      sources: [{ name: 'Reuters', url: 'https://example.com/4' }],
      key_quote: 'GPU 供需矛盾预计将持续到 2025 年。',
      confidence: 0.8,
    },
  ],
  relations: [
    {
      from_event_index: 0,
      to_event_index: 1,
      type: 'causal',
      description: 'Claude 4 发布给 OpenAI 带来竞争压力',
      confidence: 0.85,
    },
    {
      from_event_index: 0,
      to_event_index: 2,
      type: 'causal',
      description: '大模型竞争推动 GPU 需求激增',
      confidence: 0.8,
    },
  ],
  chapters: [
    { title: '第一章 · 模型之争', event_indices: [0, 1] },
    { title: '第二章 · 产业影响', event_indices: [2] },
  ],
  insight: {
    title: '模型层战争结束，应用层刚刚开始',
    body: '过去一年大模型竞争焦点从参数规模转向多模态能力和成本效率。Claude 4 的发布标志着模型层趋同化加速，未来差异化将主要体现在应用层。GPU 供需矛盾短期无解，端侧 AI 芯片是突破口。AI Agent 作为连接模型和用户的新层，是下一个增长点。',
    judgments: [
      'GPU 供需矛盾短期无解，端侧 AI 芯片是突破口',
      '模型层趋同化加速，差异化在应用层',
      'AI Agent 是下一个增长点',
    ],
    suggestions: {
      投资者: ['关注端侧 AI 芯片赛道', 'AI Agent 工具链是投资蓝海'],
      创业者: ['AI Agent 工具链有差异化机会', '多模态垂直应用是蓝海'],
      求职者: ['多模态应用开发技能需求激增', 'AI infra 人才仍然稀缺'],
    },
  },
};

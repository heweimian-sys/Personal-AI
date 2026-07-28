/**
 * 知信 · 认知加速器 — Mock 数据
 * 当后端服务未启动时，前端自动降级展示样例报告
 * 方便前端独立开发和演示
 */

import type { ModeReport, ResearchMode, ResearchResult } from './types';

const SOURCE_ANTHROPIC = {
  name: 'Anthropic 官方',
  url: 'https://example.com/anthropic-claude-4',
  published_at: '2024-03-15',
  supports: 'Claude 4 发布及多模态能力说明',
  type: 'primary',
  credibility: 'high',
};

const SOURCE_REUTERS = {
  name: 'Reuters',
  url: 'https://example.com/reuters-ai-chip-demand',
  published_at: '2024-05-01',
  supports: 'AI 芯片需求和供需紧张判断',
  type: 'media',
  credibility: 'medium',
};

const SOURCE_TECH = {
  name: 'TechCrunch',
  url: 'https://example.com/techcrunch-gpt5',
  published_at: '2024-04-01',
  supports: 'OpenAI 加速模型研发的行业报道',
  type: 'media',
  credibility: 'medium',
};

function modeReport(mode: ResearchMode): ModeReport {
  const reports: Record<ResearchMode, ModeReport> = {
    create: {
      mode: 'create',
      title: 'AI Agent 的创作角度报告',
      sections: [
        {
          title: '主题速览',
          body: 'AI Agent 的重点不只是“模型更聪明”，而是模型开始承担连续任务、调用工具和完成工作流。',
          bullets: ['适合从“人把任务交给软件”这个生活化变化切入。'],
          evidence_indices: [0, 1],
          source_refs: [SOURCE_ANTHROPIC, SOURCE_TECH],
        },
        {
          title: '差异化角度',
          body: '常见叙事会把它写成效率革命；更有空间的角度是“授权边界”：人什么时候愿意让 AI 代替自己做决定。',
          bullets: ['从信任、失控、责任归属切入。', '用具体任务场景替代宏大技术判断。', '比较个人助手、企业流程和创作者工具三种语境。'],
          evidence_indices: [1, 2],
          source_refs: [SOURCE_TECH, SOURCE_REUTERS],
        },
        {
          title: '内容提纲',
          body: '',
          bullets: ['开头：一个普通人把任务交给 AI 的具体场景。', '中段：为什么 Agent 不等于聊天机器人。', '案例：模型能力、工具调用和芯片供给如何互相牵动。', '结尾：真正的问题是人愿意交出多少控制权。'],
          evidence_indices: [0, 1, 2],
          source_refs: [SOURCE_ANTHROPIC, SOURCE_REUTERS],
        },
      ],
      source_notes: ['演示数据只展示来源绑定方式，正式使用需连接真实搜索服务。'],
    },
    work: {
      mode: 'work',
      title: 'AI Agent 的工作决策报告',
      sections: [
        {
          title: '执行摘要',
          body: 'AI Agent 值得关注，是因为它把大模型能力从对话推进到可执行流程；但落地依赖模型稳定性、工具权限、数据安全和算力成本。',
          bullets: ['事实：模型多模态和工具能力持续增强。', '判断：企业落地要先限定任务边界。'],
          evidence_indices: [0, 1],
          source_refs: [SOURCE_ANTHROPIC, SOURCE_TECH],
        },
        {
          title: '市场与趋势',
          body: '涉及市场数字时必须确认发布日期、统计口径和来源。演示数据中只保留芯片需求上升这一趋势，不把它包装成确定市场规模。',
          bullets: ['需要进一步确认：Agent 软件市场规模和企业采用率。', '需要进一步确认：算力成本下降速度。'],
          evidence_indices: [2],
          source_refs: [SOURCE_REUTERS],
        },
        {
          title: '会议速记',
          body: '',
          bullets: ['我们要让 Agent 接管哪类低风险任务？', '失败责任由谁承担？', '需要接入哪些内部工具和数据？', '有没有审计日志和权限回收机制？', '哪些指标能证明它真的节省时间？'],
          evidence_indices: [],
          source_refs: [],
        },
      ],
      source_notes: ['市场数字不足，正式决策前需要补充带日期的第三方研究或财报材料。'],
    },
    explore: {
      mode: 'explore',
      title: 'AI Agent 的探索理解报告',
      sections: [
        {
          title: '一句话认识',
          body: 'AI Agent 可以理解成会自己拆步骤、用工具、持续完成任务的 AI 助手。',
          bullets: ['它不是单次问答，而是围绕目标连续行动。'],
          evidence_indices: [0],
          source_refs: [SOURCE_ANTHROPIC],
        },
        {
          title: '常见误解',
          body: '误解之一是“Agent 等于完全自动化”。第一版更现实的理解是：它适合边界清楚、能被检查的任务。',
          bullets: ['越涉及金钱、隐私和不可逆操作，越需要人类确认。'],
          evidence_indices: [1, 2],
          source_refs: [SOURCE_TECH, SOURCE_REUTERS],
        },
        {
          title: '继续探索',
          body: '',
          bullets: ['先理解大模型如何调用工具。', '再观察一个真实 Agent 产品如何处理失败。', '最后比较个人助手和企业自动化的差异。'],
          evidence_indices: [],
          source_refs: [],
        },
      ],
      source_notes: ['演示报告建议继续阅读官方文档和权威媒体报道。'],
    },
  };
  return reports[mode];
}

/** 样例报告：AI 行业 */
export const MOCK_REPORT: ResearchResult = {
  query: 'AI行业',
  mode: 'explore',
  summary:
    '过去一年，大模型竞争焦点从参数规模转向多模态能力和成本效率。Claude 4 的发布标志着模型层趋同化加速，GPU 供需矛盾推动端侧 AI 芯片发展。AI Agent 作为连接模型和用户的新层，正在成为下一个增长点。',
  events: [
    {
      title: 'Claude 4 发布',
      summary:
        'Anthropic 发布 Claude 4，在多模态基准测试中超越所有竞争对手。新模型支持图像理解、代码生成和长文本推理，推理成本降低 60%。',
      date: '2024-03-15',
      sources: [
        SOURCE_ANTHROPIC,
        SOURCE_TECH,
      ],
      key_quote: 'Claude 4 在多模态基准测试中超越了所有竞争对手，推理成本降低 60%。',
      confidence: 0.9,
    },
    {
      title: 'OpenAI 加速 GPT-5 开发',
      summary:
        '受 Claude 4 发布的竞争压力影响，OpenAI 加速 GPT-5 开发。预计将在今年晚些时候发布，重点提升多模态能力和推理效率。',
      date: '2024-04-01',
      sources: [SOURCE_TECH],
      key_quote: 'GPT-5 预计将在今年晚些时候发布，重点提升多模态能力。',
      confidence: 0.75,
    },
    {
      title: 'AI 芯片需求激增',
      summary:
        '大模型竞争推动 GPU 需求激增，NVIDIA H100 价格上涨 40%。供需矛盾预计将持续到 2025 年，推动端侧 AI 芯片加速发展。',
      date: '2024-05-01',
      sources: [SOURCE_REUTERS],
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
  mode_report: modeReport('explore'),
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
  source_summary: {
    total: 3,
    with_url: 3,
    with_date: 3,
    high_credibility: 1,
    medium_credibility: 2,
    unsupported_events: [],
    notes: ['演示数据来源为占位链接，只用于展示可信度结构。'],
  },
};

export function getMockReport(mode: ResearchMode = 'explore'): ResearchResult {
  return {
    ...MOCK_REPORT,
    mode,
    mode_report: modeReport(mode),
  };
}

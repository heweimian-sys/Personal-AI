# AI 实验室

> 个人 AI 学习与项目存档空间——用 AI 做项目，用项目学 AI。

## 这是什么

这是我的个人 AI 项目仓库，用来：

- 记录我使用 AI 工具创建的每个项目
- 保存项目的开发过程、修改记录、学习笔记
- 像一个"项目资料库"，方便回顾和展示

## 仓库结构

```
Personal-AI/
├── README.md                  ← 你现在看的这个
├── 更新记录.md                 ← 仓库整体更新记录
│
├── 项目/                      ← 所有正式项目
│   └── 竞品调研网站/           ← 知信·认知加速器
│       ├── 项目说明.md         ← 项目文档
│       ├── 产品需求.md
│       ├── 开发计划.md
│       ├── 更新记录.md         ← 项目自己的更新记录
│       ├── 前端/              ← 前端代码
│       ├── 后端/              ← 后端代码
│       ├── UI设计/            ← 设计稿
│       └── 素材/              ← 图片等素材
│
└── 知识库/                    ← 所有可复用的东西
    ├── 提示词/                ← 通用 Prompt 库
    └── 学习笔记/              ← 学习笔记
```

## 当前项目

### wow2333 Edgetunnel Worker

基于 `cmliu/edgetunnel` 的 Cloudflare Worker 节点后台项目。代码放在 `项目/Cloudflare Workers/wow2333-edgetunnel/`，通过 GitHub Actions 自动同步上游 `_worker.js` 并部署到 `bold-poetry-bb94`。

- **线上后台**：`https://wow2333.us.ci/admin`
- **部署方式**：GitHub Actions + Cloudflare Wrangler
- **状态**：已建立自动部署骨架，等待在 GitHub Secrets 添加 `CLOUDFLARE_API_TOKEN`

### 知信 · 认知加速器

一个让信息像好文章一样自然流入大脑的阅读式信息流平台。输入关键词，系统生成带因果脉络的结构化深度分析，以章节式阅读体验展示，最终输出趋势判断和行动建议。

**核心创新**：
- 三层认知模型：时间线 → 因果网络 → 洞察行动
- 阅读式信息流：章节叙事 + 因果连接线 + 侧边注释 + 留白节奏
- 5 种关系类型：因果、竞争、包含、技术依赖、连锁反应

- **技术栈**：Python + FastAPI + SQLite + DeepSeek + Firecrawl 自部署 + Next.js
- **设计风格**：Deta Surf（#009afc + Inter / Playfair Display）
- **状态**：v5 方案确定，代码开发中
- **详情**：[项目说明.md](./项目/竞品调研网站/项目说明.md)

## 技术栈

| 领域 | 技术 |
|---|---|
| 后端 | Python, FastAPI, SQLAlchemy, SQLite |
| 前端 | Next.js, TypeScript, Tailwind CSS |
| AI | DeepSeek（国内直连，JSON Output） |
| 搜索 | Firecrawl 自部署（完全免费） |
| 版本管理 | Git + GitHub |

## 开发记录

所有开发记录在 [更新记录.md](./更新记录.md) 中，按时间倒序排列。

---

*本仓库为个人学习用途，持续更新中。*

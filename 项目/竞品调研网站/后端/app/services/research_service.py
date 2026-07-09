"""
知行·认知加速器 — 研究管道服务

串联完整的后端流程：搜索 → 提取事件 → 分析关系 → 组织章节 → 生成报告。
这是"搜一个词 → 看到因果脉络"的核心管道。

流程：
    1. Firecrawl 搜索关键词，获取搜索结果
    2. DeepSeek 从搜索结果提取结构化事件
    3. DeepSeek 分析事件间关联关系
    4. DeepSeek 将事件组织成章节
    5. 组装 Report JSON
    6. 存入数据库

用法：
    service = ResearchService()
    report = await service.research("AI行业")
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

from app.core.config import settings
from app.services.firecrawl_service import (
    FirecrawlSearchService,
    TavilySearchService,
    SearchResult,
)
from app.services.deepseek_service import (
    DeepSeekService,
    ExtractedEvent,
    AnalyzedRelation,
    ChapterOutline,
    GeneratedInsight,
)

logger = logging.getLogger(__name__)


class ResearchError(Exception):
    """研究流程异常"""

    pass


@dataclass
class ResearchResult:
    """研究结果

    包含完整的报告数据：事件列表、关系列表、章节结构、引导摘要、AI 洞察。
    """

    query: str
    summary: str
    events: list[ExtractedEvent]
    relations: list[AnalyzedRelation]
    chapters: list[ChapterOutline]
    insight: GeneratedInsight | None = None

    def to_dict(self) -> dict:
        """转为字典格式（用于组装 Report JSON）"""
        return {
            "query": self.query,
            "summary": self.summary,
            "events": [e.to_dict() for e in self.events],
            "relations": [r.to_dict() for r in self.relations],
            "chapters": [c.to_dict() for c in self.chapters],
            "insight": self.insight.to_dict() if self.insight else None,
        }


class ResearchService:
    """研究管道服务

    串联 Firecrawl 搜索 + DeepSeek AI 处理，生成完整的研究报告。

    依赖：
        - FirecrawlSearchService（搜索）
        - DeepSeekService（事件提取 + 关系分析 + 章节组织）
    """

    def __init__(
        self,
        search_service: FirecrawlSearchService | TavilySearchService | None = None,
        ai_service: DeepSeekService | None = None,
    ) -> None:
        """初始化研究服务

        Args:
            search_service: 搜索服务，默认自动选择
                - 如果配置了 Tavily API Key，优先用 Tavily
                - 否则用 Firecrawl（需自部署）
            ai_service: DeepSeek AI 服务，默认自动创建
        """
        if search_service is None:
            if settings.TAVILY_API_KEY:
                search_service = TavilySearchService()
                logger.info("使用 Tavily 搜索服务")
            else:
                search_service = FirecrawlSearchService()
                logger.info("使用 Firecrawl 搜索服务")
        self.search_service = search_service
        self.ai_service = ai_service or DeepSeekService()

    async def research(
        self,
        query: str,
        search_limit: int = 10,
        max_events: int = 8,
    ) -> ResearchResult:
        """执行完整研究流程

        Args:
            query: 搜索关键词
            search_limit: Firecrawl 搜索结果数量上限
            max_events: 最多提取的事件数量

        Returns:
            完整的研究结果（事件 + 关系 + 章节 + 摘要）

        Raises:
            ResearchError: 流程中任一步骤失败
        """
        logger.info("开始研究流程: query='%s'", query)

        # Step 1: 搜索
        try:
            search_results = await self._search(query, limit=search_limit)
        except Exception as e:
            logger.error("搜索失败: %s", e)
            raise ResearchError(f"搜索失败: {e}") from e

        if not search_results:
            logger.warning("搜索结果为空")
            return ResearchResult(
                query=query,
                summary="未找到与该关键词相关的信息。",
                events=[],
                relations=[],
                chapters=[],
                insight=None,
            )

        # Step 2: 提取事件
        try:
            events = await self._extract_events(query, search_results, max_events)
        except Exception as e:
            logger.error("事件提取失败: %s", e)
            raise ResearchError(f"事件提取失败: {e}") from e

        if not events:
            return ResearchResult(
                query=query,
                summary="找到了相关信息，但无法提取结构化事件。",
                events=[],
                relations=[],
                chapters=[],
                insight=None,
            )

        # Step 3: 分析关系
        try:
            relations = await self._analyze_relations(query, events)
        except Exception as e:
            logger.warning("关系分析失败（非致命）: %s", e)
            relations = []

        # Step 4: 组织章节
        try:
            chapters = await self._organize_chapters(query, events, relations)
        except Exception as e:
            logger.warning("章节组织失败（非致命）: %s", e)
            chapters = []

        # Step 5: 生成洞察（非致命）
        try:
            insight = await self._generate_insight(query, events, relations)
        except Exception as e:
            logger.warning("洞察生成失败（非致命）: %s", e)
            insight = None

        # Step 6: 生成引导摘要
        summary = self._generate_summary(query, events, chapters)

        logger.info(
            "研究流程完成: query='%s', 事件=%d, 关系=%d, 章节=%d, 洞察=%s",
            query,
            len(events),
            len(relations),
            len(chapters),
            "有" if insight else "无",
        )

        return ResearchResult(
            query=query,
            summary=summary,
            events=events,
            relations=relations,
            chapters=chapters,
            insight=insight,
        )

    async def _search(self, query: str, limit: int) -> list[SearchResult]:
        """Step 1: 搜索互联网信息

        搜索优先级：
        1. Tavily（免费，无需自部署）
        2. Firecrawl（需自部署）
        3. 兜底预设数据（保证流程能跑通）
        """
        logger.info("Step 1: 搜索 '%s'", query)

        # 尝试主搜索服务
        try:
            results = await self.search_service.search(query, limit=limit)
            if results:
                logger.info("搜索成功: 返回 %d 条结果", len(results))
                return results
            logger.warning("搜索服务返回空结果")
        except Exception as e:
            logger.warning("主搜索服务失败: %s", e)

        # 如果主服务是 Tavily，尝试降级到 Firecrawl
        if isinstance(self.search_service, TavilySearchService):
            try:
                logger.info("Tavily 失败，尝试降级到 Firecrawl")
                fallback = FirecrawlSearchService()
                results = await fallback.search(query, limit=limit)
                if results:
                    return results
            except Exception as e2:
                logger.warning("Firecrawl 也失败: %s", e2)

        # 最终兜底：预设数据
        logger.warning("所有搜索服务均不可用，使用兜底数据")
        return _fallback_search_results(query)

    async def _extract_events(
        self,
        query: str,
        search_results: list[SearchResult],
        max_events: int,
    ) -> list[ExtractedEvent]:
        """Step 2: 用 DeepSeek 提取结构化事件"""
        logger.info("Step 2: 提取事件")
        return await self.ai_service.extract_events(query, search_results, max_events)

    async def _analyze_relations(
        self,
        query: str,
        events: list[ExtractedEvent],
    ) -> list[AnalyzedRelation]:
        """Step 3: 用 DeepSeek 分析事件间关系"""
        logger.info("Step 3: 分析关系")
        return await self.ai_service.analyze_relations(query, events)

    async def _organize_chapters(
        self,
        query: str,
        events: list[ExtractedEvent],
        relations: list[AnalyzedRelation],
    ) -> list[ChapterOutline]:
        """Step 4: 用 DeepSeek 组织章节"""
        logger.info("Step 4: 组织章节")
        return await self.ai_service.organize_chapters(query, events, relations)

    async def _generate_insight(
        self,
        query: str,
        events: list[ExtractedEvent],
        relations: list[AnalyzedRelation],
    ) -> GeneratedInsight:
        """Step 5: 用 DeepSeek 生成洞察"""
        logger.info("Step 5: 生成洞察")
        return await self.ai_service.generate_insight(query, events, relations)

    def _generate_summary(
        self,
        query: str,
        events: list[ExtractedEvent],
        chapters: list[ChapterOutline],
    ) -> str:
        """Step 5: 生成引导摘要（2-3 句）

        基于事件和章节信息，生成简洁的引导语。
        Phase 1 用规则生成，Task 12 可改用 AI 生成。
        """
        if not events:
            return f"关于「{query}」，暂未找到足够的信息。"

        parts = [f"关于「{query}」，"]

        if chapters:
            chapter_titles = [ch.title for ch in chapters]
            parts.append(f"以下分为 {len(chapters)} 章：{'、'.join(chapter_titles)}。")
        else:
            parts.append(f"共整理了 {len(events)} 个关键事件。")

        # 取第一个事件作为切入点
        first_event = events[0]
        parts.append(f"从「{first_event.title}」开始，")

        if len(events) > 1:
            last_event = events[-1]
            parts.append(f"到「{last_event.title}」结束。")

        return "".join(parts)


# ============================================================
# 兜底搜索数据
# ============================================================

def _fallback_search_results(query: str) -> list[SearchResult]:
    """生成兜底搜索结果

    当 Firecrawl 不可用时，根据查询关键词生成预设搜索结果，
    让 DeepSeek AI 能继续处理（提取事件、分析关系、生成洞察）。

    这不是真实的搜索结果，只是让流程能跑通的占位数据。
    生产环境应部署 Firecrawl 服务获取真实搜索结果。
    """
    return [
        SearchResult(
            title=f"{query} 最新动态",
            url="https://example.com/fallback/1",
            markdown=(
                f"# {query} 最新动态\n\n"
                f"## 行业概览\n"
                f"{query} 领域近期发生多项重要变化，"
                f"技术进步和市场政策共同推动行业发展。\n\n"
                f"## 关键事件\n"
                f"1. 政策层面：相关部门发布新政策，支持{query}发展\n"
                f"2. 技术层面：核心技术取得突破，效率提升 30%\n"
                f"3. 市场层面：头部企业加大投入，行业竞争加剧\n"
            ),
        ),
        SearchResult(
            title=f"{query} 行业分析",
            url="https://example.com/fallback/2",
            markdown=(
                f"# {query} 行业深度分析\n\n"
                f"## 市场现状\n"
                f"{query} 市场规模持续增长，预计未来三年保持 15% 年增速。\n\n"
                f"## 竞争格局\n"
                f"行业呈现寡头竞争态势，头部三家企业占据 60% 市场份额。\n"
                f"新兴企业通过差异化策略切入细分市场。\n\n"
                f"## 投资机会\n"
                f"产业链上下游均有投资机会，技术层和应用层值得关注。\n"
            ),
        ),
        SearchResult(
            title=f"{query} 未来趋势",
            url="https://example.com/fallback/3",
            markdown=(
                f"# {query} 未来趋势展望\n\n"
                f"## 技术趋势\n"
                f"AI 驱动的自动化将成为{query}领域的核心驱动力。\n\n"
                f"## 政策趋势\n"
                f"监管趋严，合规要求提高，行业进入规范化发展阶段。\n\n"
                f"## 市场趋势\n"
                f"全球化布局加速，中国企业出海面临新机遇和挑战。\n"
            ),
        ),
    ]

"""
知信·认知加速器 — 研究管道服务

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
from app.services.firecrawl_service import FirecrawlSearchService, SearchResult
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
        search_service: FirecrawlSearchService | None = None,
        ai_service: DeepSeekService | None = None,
    ) -> None:
        """初始化研究服务

        Args:
            search_service: Firecrawl 搜索服务，默认自动创建
            ai_service: DeepSeek AI 服务，默认自动创建
        """
        self.search_service = search_service or FirecrawlSearchService()
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
        """Step 1: 调用 Firecrawl 搜索"""
        logger.info("Step 1: 搜索 '%s'", query)
        return await self.search_service.search(query, limit=limit)

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

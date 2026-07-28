"""
知行·认知加速器 — DeepSeek AI 服务

封装 DeepSeek API（通过 OpenAI SDK 兼容接口调用），
提供 AI 事件提取、关系分析、洞察生成等能力。

DeepSeek API 文档：https://platform.deepseek.com
JSON Output 模式：response_format={'type': 'json_object'}

核心方法：
    extract_events() — 从搜索结果提取结构化事件
    analyze_relations() — 分析事件间关联关系
    organize_chapters() — 将事件按叙事逻辑分章
    generate_insight() — 生成趋势判断和行动建议（Task 12 扩展）
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from openai import AsyncOpenAI

from app.core.config import settings
from app.services.firecrawl_service import SearchResult

logger = logging.getLogger(__name__)

RESEARCH_MODES = {"create", "work", "explore"}


def normalize_research_mode(mode: str | None) -> str:
    """Normalize user-facing research mode."""
    value = (mode or "explore").strip().lower()
    return value if value in RESEARCH_MODES else "explore"


def _guess_source_type(url: str, name: str = "") -> str:
    """Infer a coarse source type for credibility display."""
    text = f"{url} {name}".lower()
    if any(token in text for token in [".gov", "gov.cn", "mofcom", "stats.gov", "sec.gov"]):
        return "official"
    if any(token in text for token in [".edu", "arxiv", "doi.org", "nature.com", "science.org"]):
        return "academic"
    if any(token in text for token in ["reuters", "apnews", "bloomberg", "ft.com", "wsj", "economist"]):
        return "media"
    if any(token in text for token in ["github.com", "openai.com", "anthropic.com", "google", "microsoft", "nvidia"]):
        return "primary"
    return "web"


def _credibility_for_source(source_type: str, has_url: bool, has_support: bool) -> str:
    if not has_url:
        return "low"
    if source_type in {"official", "academic", "primary"} and has_support:
        return "high"
    if source_type in {"official", "academic", "primary", "media"}:
        return "medium"
    return "medium" if has_support else "low"


def _normalize_source(
    source: dict | str,
    default_support: str = "",
    default_date: str | None = None,
) -> dict:
    """Normalize source metadata used by events and mode reports."""
    if isinstance(source, str):
        raw = {"name": source, "url": ""}
    elif isinstance(source, dict):
        raw = source
    else:
        raw = {}

    name = str(raw.get("name") or raw.get("title") or raw.get("source") or "未知来源")
    url = str(raw.get("url") or raw.get("link") or "")
    published_at = raw.get("published_at") or raw.get("date") or default_date
    supports = raw.get("supports") or raw.get("claim") or default_support
    source_type = raw.get("type") or _guess_source_type(url, name)

    return {
        "name": name,
        "url": url,
        "published_at": published_at,
        "supports": supports,
        "type": source_type,
        "credibility": raw.get(
            "credibility",
            _credibility_for_source(source_type, bool(url), bool(supports)),
        ),
    }


class DeepSeekError(Exception):
    """DeepSeek 服务异常"""

    pass


class DeepSeekResponseError(DeepSeekError):
    """DeepSeek 返回的数据格式异常（JSON 解析失败等）"""

    pass


@dataclass
class ExtractedEvent:
    """AI 提取的结构化事件

    从搜索结果中由 DeepSeek 提取，包含：
    标题、摘要、日期、来源、关键引述、确信度。
    """

    title: str
    summary: str
    date: str | None = None
    sources: list[dict] = None
    key_quote: str | None = None
    confidence: float = 0.7

    def __post_init__(self) -> None:
        if self.sources is None:
            self.sources = []
        self.sources = [
            _normalize_source(src, default_support=self.summary, default_date=self.date)
            for src in self.sources
        ]

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "summary": self.summary,
            "date": self.date,
            "sources": self.sources,
            "key_quote": self.key_quote,
            "confidence": self.confidence,
        }


@dataclass
class AnalyzedRelation:
    """AI 分析的事件间关联关系

    5 种关系类型：
    - causal      因果关系   A → B
    - competitive 竞争关系   A ↔ B
    - contains    包含关系   A ⊂ B
    - dependency  技术依赖   A ⇢ B
    - chain       连锁反应   A → B → C
    """

    from_event_index: int
    to_event_index: int
    type: str
    description: str = ""
    confidence: float = 0.7

    VALID_TYPES = {"causal", "competitive", "contains", "dependency", "chain"}

    def __post_init__(self) -> None:
        if self.type not in self.VALID_TYPES:
            logger.warning("未知关系类型: %s（允许: %s）", self.type, self.VALID_TYPES)

    def to_dict(self) -> dict:
        return {
            "from_event_index": self.from_event_index,
            "to_event_index": self.to_event_index,
            "type": self.type,
            "description": self.description,
            "confidence": self.confidence,
        }


@dataclass
class ChapterOutline:
    """AI 组织的章节结构

    将事件按叙事逻辑分成 2-4 章，每章包含标题和事件索引列表。
    """

    title: str
    event_indices: list[int]

    def __post_init__(self) -> None:
        if self.event_indices is None:
            self.event_indices = []

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "event_indices": self.event_indices,
        }


@dataclass
class GeneratedInsight:
    """AI 生成的洞察

    属于"第三层认知：洞察行动"。
    包含核心判断、详细分析和分角色行动建议。

    示例：
        title: "模型层战争结束，应用层刚刚开始"
        body: "过去一年大模型竞争焦点从参数规模转向..."
        judgments: ["GPU供需矛盾短期无解", "端侧AI是下一个增长点"]
        suggestions: {
            "投资者": ["关注端侧AI芯片赛道", "关注AI Agent工具链"],
            "创业者": ["AI Agent工具链是蓝海", "多模态应用有差异化机会"],
            "求职者": ["多模态应用开发技能需求激增", "AI infra人才仍然稀缺"]
        }
    """

    title: str
    body: str = ""
    judgments: list[str] = None
    suggestions: dict[str, list[str]] = None

    def __post_init__(self) -> None:
        if self.judgments is None:
            self.judgments = []
        if self.suggestions is None:
            self.suggestions = {}

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "body": self.body,
            "judgments": self.judgments,
            "suggestions": self.suggestions,
        }


@dataclass
class ModeReportSection:
    """Mode-specific report section."""

    title: str
    body: str = ""
    bullets: list[str] = None
    evidence_indices: list[int] = None
    source_refs: list[dict] = None

    def __post_init__(self) -> None:
        if self.bullets is None:
            self.bullets = []
        if self.evidence_indices is None:
            self.evidence_indices = []
        if self.source_refs is None:
            self.source_refs = []
        self.source_refs = [_normalize_source(src) for src in self.source_refs]

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "body": self.body,
            "bullets": self.bullets,
            "evidence_indices": self.evidence_indices,
            "source_refs": self.source_refs,
        }


@dataclass
class ModeReport:
    """Mode-specific structured report."""

    mode: str
    title: str
    sections: list[ModeReportSection] = None
    source_notes: list[str] = None

    def __post_init__(self) -> None:
        self.mode = normalize_research_mode(self.mode)
        if self.sections is None:
            self.sections = []
        if self.source_notes is None:
            self.source_notes = []

    def to_dict(self) -> dict:
        return {
            "mode": self.mode,
            "title": self.title,
            "sections": [section.to_dict() for section in self.sections],
            "source_notes": self.source_notes,
        }


def _extract_response_output_text(response) -> str:
    """Extract text from an OpenAI Responses API object."""
    output_text = getattr(response, "output_text", None)
    if output_text:
        return output_text

    chunks: list[str] = []
    for item in getattr(response, "output", []) or []:
        for part in getattr(item, "content", []) or []:
            text = getattr(part, "text", None)
            if text:
                chunks.append(text)
            elif isinstance(part, dict) and part.get("text"):
                chunks.append(part["text"])

    if chunks:
        return "".join(chunks)

    if isinstance(response, dict):
        if response.get("output_text"):
            return response["output_text"]
        for item in response.get("output", []) or []:
            for part in item.get("content", []) or []:
                if part.get("text"):
                    chunks.append(part["text"])

    return "".join(chunks)


class DeepSeekService:
    """DeepSeek AI 服务

    通过 OpenAI SDK 兼容接口调用 DeepSeek，
    支持普通对话和 JSON Output 模式。

    用法：
        service = DeepSeekService()
        events = await service.extract_events(query, search_results)

    依赖配置（.env）：
        DEEPSEEK_API_KEY=sk-your-key
        DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
        DEEPSEEK_MODEL=deepseek-chat
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
    ) -> None:
        """初始化 DeepSeek 服务

        Args:
            api_key: DeepSeek API 密钥
            base_url: API 地址
            model: 模型名称
        """
        self.api_key = api_key or settings.MODEL_API_KEY or settings.OPENAI_API_KEY or settings.DEEPSEEK_API_KEY
        self.base_url = base_url or settings.MODEL_BASE_URL or settings.OPENAI_BASE_URL or settings.DEEPSEEK_BASE_URL
        self.model = model or settings.MODEL_NAME or settings.OPENAI_MODEL or settings.DEEPSEEK_MODEL
        self.wire_api = settings.MODEL_WIRE_API.lower()
        self.reasoning_effort = settings.MODEL_REASONING_EFFORT
        self.disable_response_storage = settings.DISABLE_RESPONSE_STORAGE
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI:
        """懒加载 OpenAI 异步客户端"""
        if self._client is None:
            self._client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                timeout=300.0,  # 5 分钟超时（AI 处理复杂任务需要时间）
            )
        return self._client

    async def chat_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
    ) -> dict:
        """调用 DeepSeek 并返回 JSON 格式结果

        使用 JSON Output 模式，确保返回合法 JSON。

        Args:
            system_prompt: 系统提示词
            user_prompt: 用户提示词
            temperature: 温度参数（越低越确定）

        Returns:
            解析后的 JSON 字典

        Raises:
            DeepSeekResponseError: JSON 解析失败
            DeepSeekError: API 调用失败
        """
        if self.wire_api == "responses":
            content = await self._responses_json(system_prompt, user_prompt, temperature)
        else:
            content = await self._chat_completions_json(system_prompt, user_prompt, temperature)

        try:
            result = json.loads(content)
        except json.JSONDecodeError as e:
            logger.error("DeepSeek 返回的 JSON 解析失败: %s", e)
            logger.debug("原始响应: %s", content[:500])
            raise DeepSeekResponseError(
                f"DeepSeek 返回的 JSON 解析失败: {e}"
            ) from e

        return result

    async def _chat_completions_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
    ) -> str:
        """Call Chat Completions and return raw JSON text."""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temperature,
                response_format={"type": "json_object"},
            )
        except Exception as e:
            logger.error("模型 API 调用失败: %s", e)
            raise DeepSeekError(f"模型 API 调用失败: {e}") from e

        return response.choices[0].message.content or "{}"

    async def _responses_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
    ) -> str:
        """Call Responses API and return raw JSON text."""
        payload = {
            "model": self.model,
            "input": f"{system_prompt}\n\n---\n\n{user_prompt}",
            "text": {"format": {"type": "json_object"}},
            "store": not self.disable_response_storage,
        }

        try:
            response = await self.client.responses.create(**payload)
        except Exception as e:
            logger.error("Responses API 调用失败: %s", e)
            raise DeepSeekError(f"Responses API 调用失败: {e}") from e

        content = _extract_response_output_text(response)
        return content or "{}"

    async def extract_events(
        self,
        query: str,
        search_results: list[SearchResult],
        max_events: int = 8,
        query_profile: dict | None = None,
        mode: str = "explore",
    ) -> list[ExtractedEvent]:
        """从搜索结果中提取结构化事件

        AI 处理流程的第一步：将搜索到的原始内容，
        用 DeepSeek 提取为结构化的事件列表。

        Args:
            query: 用户搜索的关键词
            search_results: Firecrawl 搜索结果列表
            max_events: 最多提取的事件数量
            query_profile: 查询画像（含 topic_type 等字段），用于选择知识框架

        Returns:
            结构化事件列表

        Raises:
            DeepSeekError: 提取失败
        """
        if not search_results:
            logger.info("搜索结果为空，跳过事件提取")
            return []

        mode = normalize_research_mode(mode)
        framework = _get_topic_framework(query_profile)
        mode_framework = _get_mode_framework(mode)
        system_prompt = (
            "\n\n".join(part for part in [mode_framework, framework, _EVENT_EXTRACTION_SYSTEM_PROMPT] if part)
        )
        user_prompt = _build_event_extraction_user_prompt(query, search_results, max_events, mode)

        logger.info(
            "开始提取事件: query='%s', 搜索结果数=%d, 最大事件数=%d",
            query,
            len(search_results),
            max_events,
        )

        result = await self.chat_json(system_prompt, user_prompt)

        events_data = result.get("events", [])
        events: list[ExtractedEvent] = []

        for event_data in events_data:
            try:
                event = ExtractedEvent(
                    title=event_data.get("title", ""),
                    summary=event_data.get("summary", ""),
                    date=event_data.get("date"),
                    sources=event_data.get("sources", []),
                    key_quote=event_data.get("key_quote"),
                    confidence=float(event_data.get("confidence", 0.7)),
                )
                events.append(event)
            except (TypeError, ValueError) as e:
                logger.warning("跳过格式异常的事件: %s", e)
                continue

        logger.info("事件提取完成: 提取了 %d 个事件", len(events))
        return events

    async def analyze_relations(
        self,
        query: str,
        events: list[ExtractedEvent],
        query_profile: dict | None = None,
        mode: str = "explore",
    ) -> list[AnalyzedRelation]:
        """分析事件间的关联关系

        AI 处理流程的第二步：分析事件之间的因果、竞争、包含、依赖、连锁关系。
        这是"因果网络"的核心，让信息不只是时间线，而是有脉络的网络。

        Args:
            query: 用户搜索的关键词
            events: extract_events() 返回的事件列表
            query_profile: 查询画像（含 topic_type 等字段），用于选择知识框架

        Returns:
            关联关系列表，from_event_index 和 to_event_index 对应 events 列表的索引
        """
        if len(events) < 2:
            logger.info("事件数不足 2 个，跳过关系分析")
            return []

        mode = normalize_research_mode(mode)
        framework = _get_topic_framework(query_profile)
        mode_framework = _get_mode_framework(mode)
        system_prompt = (
            "\n\n".join(part for part in [mode_framework, framework, _RELATION_ANALYSIS_SYSTEM_PROMPT] if part)
        )
        user_prompt = _build_relation_analysis_user_prompt(query, events)

        logger.info(
            "开始关系分析: query='%s', 事件数=%d",
            query,
            len(events),
        )

        result = await self.chat_json(system_prompt, user_prompt, temperature=0.2)

        relations_data = result.get("relations", [])
        relations: list[AnalyzedRelation] = []

        for rel_data in relations_data:
            try:
                rel = AnalyzedRelation(
                    from_event_index=int(rel_data.get("from_event_index", 0)),
                    to_event_index=int(rel_data.get("to_event_index", 0)),
                    type=rel_data.get("type", "causal"),
                    description=rel_data.get("description", ""),
                    confidence=float(rel_data.get("confidence", 0.7)),
                )
                # 校验索引范围
                if 0 <= rel.from_event_index < len(events) and 0 <= rel.to_event_index < len(events):
                    relations.append(rel)
                else:
                    logger.warning("跳过索引越界的关系: %d→%d（事件数=%d）", rel.from_event_index, rel.to_event_index, len(events))
            except (TypeError, ValueError) as e:
                logger.warning("跳过格式异常的关系: %s", e)
                continue

        logger.info("关系分析完成: 分析出 %d 个关系", len(relations))
        return relations

    async def organize_chapters(
        self,
        query: str,
        events: list[ExtractedEvent],
        relations: list[AnalyzedRelation],
        query_profile: dict | None = None,
        mode: str = "explore",
    ) -> list[ChapterOutline]:
        """将事件按叙事逻辑分成章节

        AI 处理流程的第三步：将事件和关系组织成 2-4 章的叙事结构，
        每章有标题和事件分组，形成阅读式信息流。

        Args:
            query: 用户搜索的关键词
            events: extract_events() 返回的事件列表
            relations: analyze_relations() 返回的关系列表
            query_profile: 查询画像（含 topic_type 等字段），用于选择知识框架

        Returns:
            章节列表，每个章节包含标题和事件索引
        """
        if not events:
            logger.info("事件为空，跳过章节组织")
            return []

        mode = normalize_research_mode(mode)
        framework = _get_topic_framework(query_profile)
        mode_framework = _get_mode_framework(mode)
        system_prompt = (
            "\n\n".join(part for part in [mode_framework, framework, _CHAPTER_ORGANIZATION_SYSTEM_PROMPT] if part)
        )
        user_prompt = _build_chapter_organization_user_prompt(query, events, relations)

        logger.info(
            "开始章节组织: query='%s', 事件数=%d, 关系数=%d",
            query,
            len(events),
            len(relations),
        )

        result = await self.chat_json(system_prompt, user_prompt, temperature=0.3)

        chapters_data = result.get("chapters", [])
        chapters: list[ChapterOutline] = []

        for ch_data in chapters_data:
            try:
                chapter = ChapterOutline(
                    title=ch_data.get("title", "未命名章节"),
                    event_indices=ch_data.get("event_indices", []),
                )
                chapters.append(chapter)
            except (TypeError, ValueError) as e:
                logger.warning("跳过格式异常的章节: %s", e)
                continue

        logger.info("章节组织完成: 分成 %d 章", len(chapters))
        return chapters

    async def generate_insight(
        self,
        query: str,
        events: list[ExtractedEvent],
        relations: list[AnalyzedRelation],
        query_profile: dict | None = None,
        mode: str = "explore",
    ) -> GeneratedInsight:
        """生成趋势判断和行动建议

        AI 处理流程的第四步：基于事件和关系，
        生成核心判断、详细分析和分角色行动建议。
        这是"第三层认知：洞察行动"的核心。

        Args:
            query: 用户搜索的关键词
            events: extract_events() 返回的事件列表
            relations: analyze_relations() 返回的关系列表
            query_profile: 查询画像（含 topic_type 等字段），用于选择知识框架与建议角色

        Returns:
            包含标题、判断、建议的洞察对象

        Raises:
            DeepSeekError: 生成失败
        """
        if not events:
            logger.info("事件为空，跳过洞察生成")
            return GeneratedInsight(title="", body="暂无足够信息生成洞察。")

        mode = normalize_research_mode(mode)
        topic_type = (query_profile or {}).get("topic_type", "general")
        framework = _get_topic_framework(query_profile)
        mode_framework = _get_mode_framework(mode)
        roles_block = (
            "行动建议角色（请严格使用以下角色，不要增减）：\n"
            f"{_get_insight_roles(topic_type)}\n"
            "每个角色给出 1-3 条具体可执行的建议。"
        )
        base_prompt = _INSIGHT_GENERATION_SYSTEM_PROMPT
        system_prompt = "\n\n".join(
            part for part in [mode_framework, framework, base_prompt, roles_block] if part
        )
        user_prompt = _build_insight_generation_user_prompt(query, events, relations)

        logger.info(
            "开始洞察生成: query='%s', 事件数=%d, 关系数=%d",
            query,
            len(events),
            len(relations),
        )

        result = await self.chat_json(system_prompt, user_prompt, temperature=0.4)

        try:
            insight = GeneratedInsight(
                title=result.get("title", ""),
                body=result.get("body", ""),
                judgments=result.get("judgments", []),
                suggestions=result.get("suggestions", {}),
            )
        except (TypeError, ValueError, AttributeError) as e:
            logger.warning("洞察格式异常: %s", e)
            return GeneratedInsight(title="", body="洞察生成异常。")

        logger.info("洞察生成完成: %s", insight.title[:50])
        return insight

    async def generate_mode_report(
        self,
        query: str,
        mode: str,
        events: list[ExtractedEvent],
        relations: list[AnalyzedRelation],
        search_results: list[SearchResult],
        query_profile: dict | None = None,
    ) -> ModeReport:
        """Generate the mode-specific report structure."""
        mode = normalize_research_mode(mode)
        if not events:
            return ModeReport(mode=mode, title=query, sections=[])

        system_prompt = "\n\n".join(
            part for part in [
                _get_mode_framework(mode),
                _get_topic_framework(query_profile),
                _MODE_REPORT_SYSTEM_PROMPT,
            ] if part
        )
        user_prompt = _build_mode_report_user_prompt(query, mode, events, relations, search_results)

        logger.info("开始生成模式报告: query='%s', mode='%s'", query, mode)
        result = await self.chat_json(system_prompt, user_prompt, temperature=0.35)

        try:
            sections = [
                ModeReportSection(
                    title=item.get("title", ""),
                    body=item.get("body", ""),
                    bullets=item.get("bullets", []),
                    evidence_indices=item.get("evidence_indices", []),
                    source_refs=item.get("source_refs", []),
                )
                for item in result.get("sections", [])
                if isinstance(item, dict)
            ]
            report = ModeReport(
                mode=mode,
                title=result.get("title", query),
                sections=sections,
                source_notes=result.get("source_notes", []),
            )
        except (TypeError, ValueError, AttributeError) as e:
            logger.warning("模式报告格式异常: %s", e)
            return ModeReport(mode=mode, title=query, sections=[])

        logger.info("模式报告生成完成: mode='%s', sections=%d", mode, len(report.sections))
        return report


# ============================================================
# 提示词
# ============================================================

def _get_topic_framework(query_profile: dict | None) -> str:
    """根据主题类型返回知识框架指引

    根据 query_profile.topic_type 选择对应的知识框架，
    在 4 个 system prompt 开头注入，避免所有主题都被套成行业报告。

    Args:
        query_profile: 查询画像 dict，含 topic_type, analysis_focus, tone 等字段

    Returns:
        知识框架指引文本；query_profile 为空时返回空字符串
    """
    if not query_profile:
        return ""

    topic_type = query_profile.get("topic_type", "general")
    analysis_focus = query_profile.get("analysis_focus", "")
    tone = query_profile.get("tone", "")

    frameworks = {
        "daily_word": """主题类型：日常词语
分析方向：从词义、文化含义、社会功能、当代变化、与技术/商业的连接、启发等角度展开。
不要套用行业分析模板。""",

        "abstract_concept": """主题类型：抽象概念
分析方向：从定义、历史演变、不同学科的理解、现实表现、当代趋势、启发等角度展开。
不要套用行业分析模板。""",

        "history": """主题类型：历史主题
分析方向：从背景、时间线、关键人物/事件、因果关系、长期影响、今天的影子等角度展开。
不要套用行业分析模板。""",

        "geography": """主题类型：地理空间
分析方向：从地理位置、历史角色、资源交通、文明交流、地缘政治、当代变化等角度展开。
不要套用行业分析模板。""",

        "person_or_org": """主题类型：人物/组织
分析方向：从背景/创立、关键事件/发展、影响、争议、遗产/现状等角度展开。
不要套用行业分析模板。""",

        "social_phenomenon": """主题类型：社会现象
分析方向：从现象描述、成因分析、传播路径、群体心理、社会结构影响、未来走向等角度展开。
不要套用行业分析模板。""",

        "tech_business": """主题类型：科技/商业
分析方向：从技术趋势、产品形态、竞争格局、使用场景、机会与风险、行动建议等角度展开。""",

        "question": """主题类型：问题型输入
分析方向：拆解问题、多角度解释、深层原因、判断、建议。
不要套用行业分析模板。""",

        "general": """主题类型：综合探索
分析方向：从多个学科和角度自由展开，不限于行业分析。""",
    }

    framework = frameworks.get(topic_type, frameworks["general"])
    result = f"{framework}\n分析焦点：{analysis_focus}\n语调：{tone}"

    # 行业套壳禁止项（非 tech_business 时生效）
    if topic_type not in ("tech_business", "general"):
        result += """

重要禁止项：
当主题不是科技/商业类时，禁止使用以下表达（除非搜索资料中明确出现）：
- "市场规模持续增长"
- "头部企业占据"
- "政策支持力度加大"
- "企业全球化布局"
- "行业竞争格局"
- "预计未来三年保持"
- "寡头竞争态势"
不要把所有主题套成行业报告。"""

    return result


def _get_mode_framework(mode: str) -> str:
    """Return mode-specific research focus."""
    mode = normalize_research_mode(mode)
    frameworks = {
        "create": """当前研究模式：创作
用户目标：寻找选题、内容角度、真实观点冲突、案例证据和可编辑提纲。
报告重点：常见叙事、差异化角度、观点冲突、案例证据、标题方向、内容提纲。
写作边界：不要直接代写成稿，不制造虚假争议，不给标题党。""",
        "work": """当前研究模式：工作
用户目标：在会议、汇报或项目前快速建立认知、识别风险和形成待确认问题。
报告重点：执行摘要、核心概念、市场与趋势、关键参与者、典型案例、风险、决策提示、会议问题。
写作边界：市场数字必须有日期和来源；区分事实、预测和模型判断；信息不足时写明需要进一步确认。""",
        "explore": """当前研究模式：探索
用户目标：轻松但系统地理解主题，并知道下一步还能探索什么。
报告重点：一句话认识、核心脉络、关键知识、常见误解、不同视角、与我的关系、继续探索、推荐来源。
写作边界：少堆术语，用日常语言解释必要概念，不把建议对象突然变成政府、机构或开发者。""",
    }
    return frameworks[mode]


def _get_insight_roles(topic_type: str) -> str:
    """根据主题类型返回洞察建议的角色集合

    不同主题类型面向不同的"读者角色"，避免所有主题都用
    投资者/创业者/求职者这套科技/商业角色。

    Args:
        topic_type: 主题类型

    Returns:
        角色列表的字符串表示（如 '"投资者", "创业者", "求职者"'）
    """
    roles = {
        "tech_business": '"投资者", "创业者", "求职者"',
        "daily_word": '"思考者", "创作者", "学习者"',
        "abstract_concept": '"思考者", "创作者", "学习者"',
        "history": '"历史爱好者", "教育者", "决策者"',
        "geography": '"旅行者", "研究者", "投资者"',
        "social_phenomenon": '"观察者", "参与者", "决策者"',
        "person_or_org": '"关注者", "从业者", "研究者"',
        "question": '"提问者", "决策者", "实践者"',
        "general": '"关注者", "实践者", "研究者"',
    }
    return roles.get(topic_type, roles["general"])


_EVENT_EXTRACTION_SYSTEM_PROMPT = """你是一个信息分析专家。你的任务是从搜索结果中提取结构化的事件信息。

要求：
1. 每个事件必须有明确的标题、摘要
2. 日期字段格式为 YYYY-MM-DD，如果无法确定具体日期则为 null
3. 来源字段必须尽量包含 name（来源名称）、url（来源链接）、published_at（发布日期或 null）、supports（该来源支持的具体结论）、type（official/academic/primary/media/web）、credibility（high/medium/low）
4. key_quote 是该事件中最有信息量的引述，如果没有则为 null
5. confidence 是你对这个事件真实性和重要性的确信度，范围 0-1
6. 去重：如果多个来源报道同一事件，合并为一个
7. 按时间从近到远排序（最新的在前）
8. 只提取与查询关键词真正相关的事件
9. 关键数字、人物观点、市场规模和案例必须有来源；没有可靠来源时降低 confidence，并在摘要中避免确定语气

注意：对于非科技/商业主题，"事件"可以理解为"知识节点"——即一个有价值的知识点、观点、事实或认知线索。
每个节点包含标题、摘要/解释、来源、置信度。
不要为了套模板而硬找"新闻事件"或"市场动态"。

输出格式（JSON）：
{
  "events": [
    {
      "title": "事件标题（简洁有力，15-30字）",
      "summary": "事件摘要（100-200字，包含关键事实）",
      "date": "2024-03-15 或 null",
      "sources": [{
        "name": "来源名称",
        "url": "https://...",
        "published_at": "2024-03-15 或 null",
        "supports": "该来源支持的具体结论",
        "type": "official|academic|primary|media|web",
        "credibility": "high|medium|low"
      }],
      "key_quote": "关键引述或 null",
      "confidence": 0.85
    }
  ]
}"""


def _build_event_extraction_user_prompt(
    query: str,
    search_results: list[SearchResult],
    max_events: int,
    mode: str = "explore",
) -> str:
    """构建事件提取的用户提示词

    将搜索结果格式化为 AI 可读的文本。
    """
    mode = normalize_research_mode(mode)
    parts = [f"查询关键词：{query}\n"]
    parts.append(f"研究模式：{mode}\n")
    parts.append(f"请从以下搜索结果中提取最多 {max_events} 个关键事件。\n")
    parts.append("请优先保留能支撑模式报告关键结论的来源，并说明每个来源支持什么结论。\n")
    parts.append("---\n")

    for i, result in enumerate(search_results, 1):
        parts.append(f"【搜索结果 {i}】")
        parts.append(f"标题：{result.title}")
        parts.append(f"URL：{result.url}")
        if result.description:
            parts.append(f"描述：{result.description}")
        if result.markdown:
            # 截取 Markdown 内容，避免超出 token 限制
            markdown_content = result.markdown[:2000]
            parts.append(f"内容：\n{markdown_content}")
        parts.append("---\n")

    return "\n".join(parts)


# ============================================================
# 关系分析提示词
# ============================================================

_RELATION_ANALYSIS_SYSTEM_PROMPT = """你是一个关系分析专家。你的任务是分析事件之间的关联关系。

5 种关系类型：
1. causal（因果关系）：A 导致 B。例如"Claude 4 发布" → "OpenAI 加速 GPT-5 开发"
2. competitive（竞争关系）：A 和 B 互相竞争。例如"GPT-5" ↔ "Claude 4"
3. contains（包含关系）：A 是 B 的一部分。例如"端侧AI芯片" ⊂ "半导体产业链"
4. dependency（技术依赖）：A 依赖 B 才能运作。例如"AI应用" ⇢ "GPU供应"
5. chain（连锁反应）：A → B → C 的连锁过程。例如"成本下降 → 创业潮 → 人才短缺"

要求：
1. from_event_index 和 to_event_index 是事件列表中的索引（从 0 开始）
2. 只分析有明确关联的事件对，不要强行关联
3. description 解释为什么存在这个关系（50-100字）
4. confidence 是你对这个关系的确信度，范围 0-1
5. 每对事件只标注一种最主要的关系类型

输出格式（JSON）：
{
  "relations": [
    {
      "from_event_index": 0,
      "to_event_index": 1,
      "type": "causal",
      "description": "Claude 4 的发布给 OpenAI 带来竞争压力，迫使其加速 GPT-5 开发",
      "confidence": 0.85
    }
  ]
}"""


def _build_relation_analysis_user_prompt(
    query: str,
    events: list[ExtractedEvent],
) -> str:
    """构建关系分析的用户提示词"""
    parts = [f"查询关键词：{query}\n"]
    parts.append("请分析以下事件之间的关联关系。\n")
    parts.append("---\n")
    parts.append("事件列表：\n")

    for i, event in enumerate(events):
        parts.append(f"[{i}] {event.title}")
        parts.append(f"    日期：{event.date or '未知'}")
        parts.append(f"    摘要：{event.summary}")
        parts.append("")

    return "\n".join(parts)


# ============================================================
# 章节组织提示词
# ============================================================

_CHAPTER_ORGANIZATION_SYSTEM_PROMPT = """你是一个叙事结构设计专家。你的任务是将事件按叙事逻辑组织成章节。

要求：
1. 分成 2-4 章，不要太多也不要太少
2. 每章 2-4 个事件，保持均衡
3. 章节标题要有叙事感，像一篇深度报道的章节标题
4. 章节顺序应符合逻辑：可以按时间线、按因果链、或按主题分类
5. event_indices 是事件列表中的索引（从 0 开始）
6. 每个事件只能出现在一个章节中
7. 所有事件都应被分配到某个章节中

输出格式（JSON）：
{
  "chapters": [
    {
      "title": "第一章·模型之争",
      "event_indices": [0, 1, 2]
    },
    {
      "title": "第二章·应用爆发",
      "event_indices": [3, 4]
    }
  ]
}"""


def _build_chapter_organization_user_prompt(
    query: str,
    events: list[ExtractedEvent],
    relations: list[AnalyzedRelation],
) -> str:
    """构建章节组织的用户提示词"""
    parts = [f"查询关键词：{query}\n"]
    parts.append("请将以下事件和关系组织成 2-4 章的叙事结构。\n")
    parts.append("---\n")
    parts.append("事件列表：\n")

    for i, event in enumerate(events):
        parts.append(f"[{i}] {event.title}（{event.date or '日期未知'}）")
        parts.append(f"    {event.summary[:100]}")
        parts.append("")

    if relations:
        parts.append("已知关联关系：\n")
        for rel in relations:
            parts.append(
                f"  [{rel.from_event_index}] --{rel.type}--> [{rel.to_event_index}]: {rel.description}"
            )
        parts.append("")

    return "\n".join(parts)


# ============================================================
# 洞察生成提示词
# ============================================================

_INSIGHT_GENERATION_SYSTEM_PROMPT = """你是一个深度分析专家和战略顾问。你的任务是基于事件和关系，生成趋势判断和行动建议。

这是"第三层认知：洞察行动"——不只是告诉用户发生了什么，而是告诉用户"这意味着什么"和"该怎么办"。

要求：
1. title 是一句话核心判断，要有洞察力，像深度报道的标题（15-30字）
2. body 是详细分析，解释为什么得出这些判断（200-400字）
3. judgments 是 2-4 个关键判断，每个一句话（20-50字）
4. suggestions 是按角色分组的行动建议。具体角色集合见下方"行动建议角色"，请严格使用这些角色，不要增减。
   每个角色 1-3 条建议，每条一句话（20-50字）
5. 判断要有依据，不要空话套话
6. 建议要具体可执行，不要"关注行业动态"这种废话

输出格式（JSON）：
{
  "title": "一句话核心判断",
  "body": "详细分析，解释为什么得出这些判断",
  "judgments": [
    "关键判断1",
    "关键判断2",
    "关键判断3"
  ],
  "suggestions": {
    "角色A": ["建议1", "建议2"],
    "角色B": ["建议1"],
    "角色C": ["建议1", "建议2"]
  }
}"""


def _build_insight_generation_user_prompt(
    query: str,
    events: list[ExtractedEvent],
    relations: list[AnalyzedRelation],
) -> str:
    """构建洞察生成的用户提示词"""
    parts = [f"查询关键词：{query}\n"]
    parts.append("请基于以下事件和关系，生成趋势判断和行动建议。\n")
    parts.append("---\n")
    parts.append("事件列表：\n")

    for i, event in enumerate(events):
        parts.append(f"[{i}] {event.title}（{event.date or '日期未知'}）")
        parts.append(f"    {event.summary}")
        parts.append("")

    if relations:
        parts.append("已知关联关系：\n")
        for rel in relations:
            parts.append(
                f"  [{rel.from_event_index}] --{rel.type}--> [{rel.to_event_index}]: {rel.description}"
            )
        parts.append("")

    parts.append("---\n")
    parts.append("请从事件中提炼出核心趋势判断，并给出分角色行动建议。")

    return "\n".join(parts)


# ============================================================
# 三模式报告提示词
# ============================================================

_MODE_REPORT_SYSTEM_PROMPT = """你是一个可信研究报告编辑。你的任务是把已经提取出的事件、关系和来源，整理成当前模式需要的结构化报告。

共同要求：
1. 只能基于给定事件、关系和搜索来源生成，不编造数字、案例、人物观点或链接。
2. 事实、预测、建议要用不同表达区分；不确定时写明“需要进一步确认”。
3. 每个关键结论、关键数字、案例或观点冲突，都要在 source_refs 中引用能支撑它的来源。
4. source_refs 每项包含 name、url、published_at、supports、type、credibility。
5. 如果来源不足，要在 source_notes 中明确提醒，而不是用确定语气掩盖。

模式结构：
- create：主题速览、常见叙事、差异化角度、观点冲突、案例与证据、标题方向、内容提纲、来源。
- work：执行摘要、核心概念、市场与趋势、关键参与者、典型案例、争议与风险、决策提示、会议速记、来源。
- explore：一句话认识、核心脉络、关键知识、常见误解、不同视角、与我的关系、继续探索、来源。

输出格式（JSON）：
{
  "title": "适合当前模式的报告标题",
  "sections": [
    {
      "title": "章节标题",
      "body": "章节正文，1-3段，避免空话",
      "bullets": ["要点1", "要点2"],
      "evidence_indices": [0, 2],
      "source_refs": [{
        "name": "来源名称",
        "url": "https://...",
        "published_at": "2024-03-15 或 null",
        "supports": "该来源支持的具体结论",
        "type": "official|academic|primary|media|web",
        "credibility": "high|medium|low"
      }]
    }
  ],
  "source_notes": ["来源不足或交叉验证状态说明"]
}"""


def _build_mode_report_user_prompt(
    query: str,
    mode: str,
    events: list[ExtractedEvent],
    relations: list[AnalyzedRelation],
    search_results: list[SearchResult],
) -> str:
    """Build mode report prompt from structured evidence."""
    mode = normalize_research_mode(mode)
    parts = [f"查询关键词：{query}", f"研究模式：{mode}", ""]
    parts.append("事件/知识节点：")
    for i, event in enumerate(events):
        parts.append(f"[{i}] {event.title}（{event.date or '日期未知'}，置信度 {event.confidence:.2f}）")
        parts.append(f"摘要：{event.summary}")
        if event.key_quote:
            parts.append(f"引述：{event.key_quote}")
        if event.sources:
            parts.append("来源：")
            for src in event.sources:
                parts.append(
                    "- {name} | {published_at} | {type}/{credibility} | {url} | 支持：{supports}".format(
                        name=src.get("name", "未知来源"),
                        published_at=src.get("published_at") or "日期未知",
                        type=src.get("type", "web"),
                        credibility=src.get("credibility", "low"),
                        url=src.get("url", ""),
                        supports=src.get("supports", ""),
                    )
                )
        parts.append("")

    if relations:
        parts.append("关系：")
        for rel in relations:
            parts.append(
                f"- [{rel.from_event_index}] --{rel.type}--> [{rel.to_event_index}]：{rel.description}"
            )
        parts.append("")

    parts.append("搜索来源列表（用于补充来源可信度，不要编造这里没有的链接）：")
    for i, result in enumerate(search_results, 1):
        parts.append(f"{i}. {result.title} | {result.url}")
        if result.description:
            parts.append(f"   描述：{result.description[:240]}")
    parts.append("")
    parts.append("请按当前模式结构生成报告，并为关键结论绑定 source_refs。")
    return "\n".join(parts)

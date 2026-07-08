"""
知信·认知加速器 — DeepSeek AI 服务

封装 DeepSeek API（通过 OpenAI SDK 兼容接口调用），
提供 AI 事件提取、关系分析、洞察生成等能力。

DeepSeek API 文档：https://platform.deepseek.com
JSON Output 模式：response_format={'type': 'json_object'}

核心方法：
    extract_events() — 从搜索结果提取结构化事件
    （后续 Task 5/12 会扩展 analyze_relations() 和 generate_insight()）
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from openai import AsyncOpenAI

from app.core.config import settings
from app.services.firecrawl_service import SearchResult

logger = logging.getLogger(__name__)


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

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "summary": self.summary,
            "date": self.date,
            "sources": self.sources,
            "key_quote": self.key_quote,
            "confidence": self.confidence,
        }


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
        self.api_key = api_key or settings.DEEPSEEK_API_KEY
        self.base_url = base_url or settings.DEEPSEEK_BASE_URL
        self.model = model or settings.DEEPSEEK_MODEL
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI:
        """懒加载 OpenAI 异步客户端"""
        if self._client is None:
            self._client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
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
            logger.error("DeepSeek API 调用失败: %s", e)
            raise DeepSeekError(f"DeepSeek API 调用失败: {e}") from e

        content = response.choices[0].message.content

        try:
            result = json.loads(content)
        except json.JSONDecodeError as e:
            logger.error("DeepSeek 返回的 JSON 解析失败: %s", e)
            logger.debug("原始响应: %s", content[:500])
            raise DeepSeekResponseError(
                f"DeepSeek 返回的 JSON 解析失败: {e}"
            ) from e

        return result

    async def extract_events(
        self,
        query: str,
        search_results: list[SearchResult],
        max_events: int = 8,
    ) -> list[ExtractedEvent]:
        """从搜索结果中提取结构化事件

        AI 处理流程的第一步：将搜索到的原始内容，
        用 DeepSeek 提取为结构化的事件列表。

        Args:
            query: 用户搜索的关键词
            search_results: Firecrawl 搜索结果列表
            max_events: 最多提取的事件数量

        Returns:
            结构化事件列表

        Raises:
            DeepSeekError: 提取失败
        """
        if not search_results:
            logger.info("搜索结果为空，跳过事件提取")
            return []

        system_prompt = _EVENT_EXTRACTION_SYSTEM_PROMPT
        user_prompt = _build_event_extraction_user_prompt(query, search_results, max_events)

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


# ============================================================
# 提示词
# ============================================================

_EVENT_EXTRACTION_SYSTEM_PROMPT = """你是一个信息分析专家。你的任务是从搜索结果中提取结构化的事件信息。

要求：
1. 每个事件必须有明确的标题、摘要
2. 日期字段格式为 YYYY-MM-DD，如果无法确定具体日期则为 null
3. 来源字段包含 name（来源名称）和 url（来源链接）
4. key_quote 是该事件中最有信息量的引述，如果没有则为 null
5. confidence 是你对这个事件真实性和重要性的确信度，范围 0-1
6. 去重：如果多个来源报道同一事件，合并为一个
7. 按时间从近到远排序（最新的在前）
8. 只提取与查询关键词真正相关的事件

输出格式（JSON）：
{
  "events": [
    {
      "title": "事件标题（简洁有力，15-30字）",
      "summary": "事件摘要（100-200字，包含关键事实）",
      "date": "2024-03-15 或 null",
      "sources": [{"name": "来源名称", "url": "https://..."}],
      "key_quote": "关键引述或 null",
      "confidence": 0.85
    }
  ]
}"""


def _build_event_extraction_user_prompt(
    query: str,
    search_results: list[SearchResult],
    max_events: int,
) -> str:
    """构建事件提取的用户提示词

    将搜索结果格式化为 AI 可读的文本。
    """
    parts = [f"查询关键词：{query}\n"]
    parts.append(f"请从以下搜索结果中提取最多 {max_events} 个关键事件。\n")
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

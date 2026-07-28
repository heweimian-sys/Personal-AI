"""
三模式与来源可信度测试
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.deepseek_service import (
    DeepSeekService,
    ExtractedEvent,
    ModeReport,
    ModeReportSection,
)
from app.services.firecrawl_service import SearchResult
from app.services.research_service import ResearchService, ResearchResult


def _search_results() -> list[SearchResult]:
    return [
        SearchResult(
            title="AI Agent 报告",
            url="https://example.com/report",
            description="AI Agent 市场趋势与风险",
            markdown="AI Agent 正在进入企业流程。",
        )
    ]


def _events() -> list[ExtractedEvent]:
    return [
        ExtractedEvent(
            title="企业开始试点 AI Agent",
            summary="企业将 AI Agent 用于客服和内部流程。",
            date="2024-05-01",
            sources=[
                {
                    "name": "Reuters",
                    "url": "https://example.com/reuters-agent",
                    "published_at": "2024-05-01",
                    "supports": "企业开始试点 AI Agent",
                    "type": "media",
                    "credibility": "medium",
                }
            ],
            confidence=0.82,
        )
    ]


@pytest.mark.asyncio
async def test_research_mode_flows_into_search_and_ai_calls():
    search = AsyncMock()
    search.search = AsyncMock(return_value=_search_results())

    ai = AsyncMock()
    ai.extract_events = AsyncMock(return_value=_events())
    ai.analyze_relations = AsyncMock(return_value=[])
    ai.organize_chapters = AsyncMock(return_value=[])
    ai.generate_insight = AsyncMock(return_value=None)
    ai.generate_mode_report = AsyncMock(
        return_value=ModeReport(
            mode="work",
            title="AI Agent 工作报告",
            sections=[ModeReportSection(title="执行摘要", body="适合会前快速建立认知。")],
        )
    )

    service = ResearchService(search_service=search, ai_service=ai)
    result = await service.research("AI Agent", mode="work")

    assert result.mode == "work"
    assert result.mode_report is not None
    assert result.mode_report.mode == "work"
    assert result.source_summary is not None
    assert result.source_summary["with_date"] == 1

    search.search.assert_called_once()
    assert "市场" in search.search.call_args.args[0]
    assert ai.extract_events.call_args.args[4] == "work"
    assert ai.generate_mode_report.call_args.args[1] == "work"


@pytest.mark.asyncio
async def test_api_accepts_mode_and_passes_it_to_service(client):
    with patch("app.main.ResearchService") as MockService:
        mock_instance = MockService.return_value
        mock_instance.research = AsyncMock(
            return_value=ResearchResult(
                query="内卷",
                mode="create",
                summary="创作摘要",
                events=[],
                relations=[],
                chapters=[],
            )
        )

        response = await client.post("/api/research", json={"query": "内卷", "mode": "create"})

    assert response.status_code == 200
    assert response.json()["mode"] == "create"
    mock_instance.research.assert_called_once()
    assert mock_instance.research.call_args.kwargs["mode"] == "create"


@pytest.mark.asyncio
async def test_api_rejects_invalid_mode(client):
    response = await client.post("/api/research", json={"query": "月亮", "mode": "invalid"})
    assert response.status_code == 400


def test_event_sources_are_normalized_for_credibility():
    event = ExtractedEvent(
        title="NASA 发布月球资料",
        summary="NASA 资料用于解释月球基本事实。",
        date="2024-01-01",
        sources=[{"name": "NASA", "url": "https://www.nasa.gov/moon"}],
    )

    source = event.sources[0]
    assert source["published_at"] == "2024-01-01"
    assert source["supports"] == event.summary
    assert source["type"] in {"official", "web"}
    assert source["credibility"] in {"high", "medium"}


@pytest.mark.asyncio
async def test_generate_mode_report_parses_source_refs():
    service = DeepSeekService(api_key="test-key")
    with patch.object(service, "chat_json", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = {
            "title": "内卷创作报告",
            "sections": [
                {
                    "title": "差异化角度",
                    "body": "从规则和评价体系切入。",
                    "bullets": ["避开单纯焦虑叙事"],
                    "evidence_indices": [0],
                    "source_refs": [
                        {
                            "name": "研究来源",
                            "url": "https://example.com/source",
                            "published_at": "2024-01-02",
                            "supports": "支持差异化角度",
                            "type": "academic",
                            "credibility": "high",
                        }
                    ],
                }
            ],
            "source_notes": ["已绑定来源"],
        }

        report = await service.generate_mode_report(
            "内卷",
            "create",
            _events(),
            [],
            _search_results(),
        )

    assert report.mode == "create"
    assert report.sections[0].title == "差异化角度"
    assert report.sections[0].source_refs[0]["credibility"] == "high"
    assert "创作" in mock_chat.call_args.args[0]

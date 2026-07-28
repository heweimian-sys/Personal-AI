"""
历史报告 API 测试

验证研究结果落库后，可以通过历史列表、详情、Dashboard 和删除接口访问。
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.deepseek_service import AnalyzedRelation, ChapterOutline, ExtractedEvent, GeneratedInsight
from app.services.research_service import ResearchResult


def _result() -> ResearchResult:
    events = [
        ExtractedEvent(
            title="事件 A",
            summary="事件 A 摘要",
            date="2026-07-01",
            sources=[{"name": "来源 A", "url": "https://example.com/a"}],
            confidence=0.9,
        ),
        ExtractedEvent(
            title="事件 B",
            summary="事件 B 摘要",
            date="2026-07-02",
            sources=[{"name": "来源 B", "url": "https://example.com/b"}],
            confidence=0.8,
        ),
    ]
    return ResearchResult(
        query="测试主题",
        summary="测试主题摘要",
        events=events,
        relations=[
            AnalyzedRelation(
                from_event_index=0,
                to_event_index=1,
                type="causal",
                description="事件 A 推动事件 B",
                confidence=0.75,
            )
        ],
        chapters=[ChapterOutline(title="第一章", event_indices=[0, 1])],
        insight=GeneratedInsight(
            title="测试洞察",
            body="洞察正文",
            judgments=["判断一"],
            suggestions={"研究者": ["继续核查来源"]},
        ),
    )


@pytest.mark.asyncio
async def test_research_persists_report_and_lists_history(client):
    """生成报告后，历史列表可以读到保存记录。"""
    with patch("app.main.ResearchService") as MockService:
        mock_instance = MockService.return_value
        mock_instance.research = AsyncMock(return_value=_result())

        response = await client.post("/api/research", json={"query": "测试主题"})

    assert response.status_code == 200
    report_id = response.json()["report_id"]

    history = await client.get("/api/reports")
    assert history.status_code == 200
    items = history.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == report_id
    assert items[0]["event_count"] == 2
    assert items[0]["relation_count"] == 1
    assert items[0]["insight_title"] == "测试洞察"


@pytest.mark.asyncio
async def test_report_detail_and_dashboard_and_delete(client):
    """报告详情、Dashboard 统计和删除接口可串联工作。"""
    with patch("app.main.ResearchService") as MockService:
        mock_instance = MockService.return_value
        mock_instance.research = AsyncMock(return_value=_result())

        created = await client.post("/api/research", json={"query": "测试主题"})

    report_id = created.json()["report_id"]

    detail = await client.get(f"/api/reports/{report_id}")
    assert detail.status_code == 200
    payload = detail.json()
    assert payload["query"] == "测试主题"
    assert len(payload["events"]) == 2
    assert payload["relations"][0]["from_event_index"] == 0
    assert payload["relations"][0]["to_event_index"] == 1
    assert payload["insight"]["title"] == "测试洞察"

    dashboard = await client.get("/api/dashboard")
    assert dashboard.status_code == 200
    stats = dashboard.json()
    assert stats["total_reports"] == 1
    assert stats["total_events"] == 2
    assert stats["total_relations"] == 1
    assert stats["total_insights"] == 1

    deleted = await client.delete(f"/api/reports/{report_id}")
    assert deleted.status_code == 200
    missing = await client.get(f"/api/reports/{report_id}")
    assert missing.status_code == 404

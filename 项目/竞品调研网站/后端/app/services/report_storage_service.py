"""
知行·认知加速器 — 报告持久化服务

将研究管道生成的 ResearchResult 保存到现有数据库模型，并把历史报告
重新组装成前端可消费的 ResearchResult JSON。
"""
from __future__ import annotations

from datetime import date

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.event import Event
from app.models.insight import Insight
from app.models.relation import Relation
from app.models.report import Report
from app.services.research_service import ResearchResult


def _parse_event_date(value: str | None) -> date | None:
    """Parse ISO-like event dates; keep uncertain dates out of the DB date column."""
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


async def save_research_result(db: AsyncSession, result: ResearchResult) -> Report:
    """Persist a generated research result and return the saved report."""
    report = Report(
        query=result.query,
        summary=result.summary,
        chapters={
            "items": [chapter.to_dict() for chapter in result.chapters],
            "mode": result.mode,
            "mode_report": result.mode_report.to_dict() if result.mode_report else None,
            "query_profile": result.query_profile,
            "source_summary": result.source_summary,
            "source_status": result.source_status,
            "warning": result.warning,
        },
    )
    db.add(report)
    await db.flush()

    events: list[Event] = []
    for item in result.events:
        event = Event(
            report_id=report.id,
            title=item.title,
            summary=item.summary,
            date=_parse_event_date(item.date),
            sources=item.sources,
            confidence=item.confidence,
            key_quote=item.key_quote,
        )
        db.add(event)
        events.append(event)

    await db.flush()

    for relation in result.relations:
        from_event = _event_at(events, relation.from_event_index)
        to_event = _event_at(events, relation.to_event_index)
        if not from_event or not to_event:
            continue
        db.add(
            Relation(
                report_id=report.id,
                from_event_id=from_event.id,
                to_event_id=to_event.id,
                type=relation.type,
                description=relation.description,
                confidence=relation.confidence,
            )
        )

    if result.insight:
        db.add(
            Insight(
                report_id=report.id,
                title=result.insight.title,
                body=result.insight.body,
                judgments=result.insight.judgments,
                suggestions=result.insight.suggestions,
                related_event_ids=[event.id for event in events],
                related_relation_ids=[],
            )
        )

    await db.commit()
    await db.refresh(report)
    return report


def _event_at(events: list[Event], index: int) -> Event | None:
    if index < 0 or index >= len(events):
        return None
    return events[index]


async def list_report_summaries(db: AsyncSession, limit: int = 30) -> list[dict]:
    """Return compact report rows for history/dashboard pages."""
    safe_limit = min(max(limit, 1), 100)
    stmt = (
        select(Report)
        .options(
            selectinload(Report.events),
            selectinload(Report.relations),
            selectinload(Report.insights),
        )
        .order_by(desc(Report.generated_at), desc(Report.id))
        .limit(safe_limit)
    )
    result = await db.execute(stmt)
    reports = result.scalars().all()
    return [_summary_to_dict(report) for report in reports]


async def get_report_payload(db: AsyncSession, report_id: int) -> dict | None:
    """Load one report and return a full front-end payload."""
    stmt = (
        select(Report)
        .options(
            selectinload(Report.events),
            selectinload(Report.relations),
            selectinload(Report.insights),
        )
        .where(Report.id == report_id)
    )
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()
    if report is None:
        return None
    return report_to_payload(report)


async def delete_report(db: AsyncSession, report_id: int) -> bool:
    """Delete a saved report. ORM cascade removes events, relations and insights."""
    stmt = (
        select(Report)
        .options(
            selectinload(Report.events),
            selectinload(Report.relations),
            selectinload(Report.insights),
        )
        .where(Report.id == report_id)
    )
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()
    if report is None:
        return False
    await db.delete(report)
    await db.commit()
    return True


async def get_dashboard_stats(db: AsyncSession) -> dict:
    """Return high-level product stats for the dashboard."""
    total_reports = await db.scalar(select(func.count(Report.id)))
    total_events = await db.scalar(select(func.count(Event.id)))
    total_relations = await db.scalar(select(func.count(Relation.id)))
    total_insights = await db.scalar(select(func.count(Insight.id)))
    latest = await list_report_summaries(db, limit=5)
    return {
        "total_reports": total_reports or 0,
        "total_events": total_events or 0,
        "total_relations": total_relations or 0,
        "total_insights": total_insights or 0,
        "latest_reports": latest,
    }


def _summary_to_dict(report: Report) -> dict:
    insight = report.insights[0] if report.insights else None
    return {
        "id": report.id,
        "query": report.query,
        "summary": report.summary,
        "generated_at": report.generated_at.isoformat() if report.generated_at else None,
        "event_count": len(report.events),
        "relation_count": len(report.relations),
        "chapter_count": len(_chapter_items(report)),
        "insight_title": insight.title if insight else None,
    }


def report_to_payload(report: Report) -> dict:
    """Rebuild the full ResearchResult JSON shape from ORM objects."""
    events = sorted(report.events, key=lambda event: event.id)
    event_id_to_index = {event.id: index for index, event in enumerate(events)}
    relations = sorted(report.relations, key=lambda relation: relation.id)
    insight = report.insights[0] if report.insights else None
    metadata = _chapter_metadata(report)

    return {
        "report_id": report.id,
        "query": report.query,
        "mode": metadata.get("mode", "explore"),
        "summary": report.summary,
        "events": [
            {
                "title": event.title,
                "summary": event.summary,
                "date": event.date.isoformat() if event.date else None,
                "sources": event.sources or [],
                "key_quote": event.key_quote,
                "confidence": event.confidence,
            }
            for event in events
        ],
        "relations": [
            {
                "from_event_index": event_id_to_index.get(relation.from_event_id, -1),
                "to_event_index": event_id_to_index.get(relation.to_event_id, -1),
                "type": relation.type,
                "description": relation.description,
                "confidence": relation.confidence,
            }
            for relation in relations
            if relation.from_event_id in event_id_to_index and relation.to_event_id in event_id_to_index
        ],
        "chapters": _chapter_items(report),
        "mode_report": metadata.get("mode_report"),
        "insight": {
            "title": insight.title,
            "body": insight.body,
            "judgments": insight.judgments or [],
            "suggestions": insight.suggestions or {},
        }
        if insight
        else None,
        "query_profile": metadata.get("query_profile"),
        "source_summary": metadata.get("source_summary"),
        "source_status": metadata.get("source_status", "saved"),
        "warning": metadata.get("warning"),
        "generated_at": report.generated_at.isoformat() if report.generated_at else None,
    }


def _chapter_metadata(report: Report) -> dict:
    raw = report.chapters or []
    return raw if isinstance(raw, dict) else {}


def _chapter_items(report: Report) -> list:
    raw = report.chapters or []
    if isinstance(raw, dict):
        items = raw.get("items", [])
        return items if isinstance(items, list) else []
    return raw if isinstance(raw, list) else []

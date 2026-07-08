"""
知信·认知加速器 — FastAPI 应用入口

启动方式：
    cd 后端
    uvicorn app.main:app --reload

访问：
    API 文档：http://localhost:8000/docs
    健康检查：http://localhost:8000/health
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.db import init_db
from app.core.rate_limit import RateLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时初始化数据库，关闭时清理资源"""
    # 启动
    await init_db()
    # 校验关键配置
    if not settings.DEEPSEEK_API_KEY:
        print("⚠  警告：未配置 DEEPSEEK_API_KEY，AI 功能不可用")
    if not settings.FIRECRAWL_API_KEY:
        print("⚠  警告：未配置 FIRECRAWL_API_KEY，搜索功能不可用")
    if not settings.ACCESS_PASSWORD:
        print("⚠  警告：未配置 ACCESS_PASSWORD，API 无认证保护")
    yield
    # 关闭（目前无需额外清理）


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    description="知信·认知加速器 — 让信息像好文章一样自然流入大脑",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS 中间件（允许前端跨域访问）
# Phase 1 仅开放 GET 和 POST
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

# 频率限制中间件
app.add_middleware(RateLimitMiddleware)


@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "0.1.0",
    }


@app.get("/")
async def root():
    """根路径"""
    return {
        "name": settings.APP_NAME,
        "description": "认知加速器 — 输入关键词，看到信息的因果脉络",
        "docs": "/docs",
        "health": "/health",
    }

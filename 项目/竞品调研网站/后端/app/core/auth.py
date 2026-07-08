"""
知信·认知加速器 — 认证依赖

提供 Bearer Token 认证方案，作为 Phase 1 的最小安全层。
使用方式：
    from app.core.auth import verify_access_token

    @app.post("/api/research", dependencies=[Depends(verify_access_token)])
    async def research(...):
        ...

如果未配置 ACCESS_PASSWORD，认证自动跳过（开发模式）。
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, Header

from app.core.config import settings


async def verify_access_token(
    authorization: str | None = Header(None),
) -> None:
    """验证 Bearer Token

    从 Authorization 请求头中提取 token，与配置的 ACCESS_PASSWORD 比对。

    安全特性：
    - 未配置 ACCESS_PASSWORD 时自动跳过（开发环境友好）
    - 使用常量时间比较防止时序攻击
    - 错误信息不区分 token 缺失/无效（防止枚举攻击）
    """
    # 未配置密码时跳过认证
    if not settings.ACCESS_PASSWORD:
        return

    # 提取 Bearer token
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="未授权访问",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.removeprefix("Bearer ")

    # 常量时间比较
    import hmac
    if not hmac.compare_digest(token, settings.ACCESS_PASSWORD):
        raise HTTPException(
            status_code=401,
            detail="未授权访问",
            headers={"WWW-Authenticate": "Bearer"},
        )

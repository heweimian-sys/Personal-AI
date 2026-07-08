"""
知信·认知加速器 — IP 频率限制中间件

Phase 1 轻量方案：基于内存的滑动窗口计数器，零外部依赖。
生产环境建议替换为 Redis 方案（一致性更好）。

使用方式：
    from app.core.rate_limit import RateLimitMiddleware
    app.add_middleware(RateLimitMiddleware)
"""
from __future__ import annotations

import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """简单的 IP 级别滑动窗口频率限制

    默认：30 请求/分钟/IP。
    可通过 RATE_LIMIT 环境变量配置（格式：次数/秒，如 "30/60" 表示 60 秒内 30 次）。

    健康检查 /health 和文档 /docs 路由不受限制。
    """

    # 免限流路径
    _EXEMPT_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}

    def __init__(self, app, max_requests: int | None = None, window_seconds: int | None = None):
        super().__init__(app)
        # 解析 RATE_LIMIT 配置：格式 "次数/秒数"
        rate_config = settings.RATE_LIMIT
        if "/" in rate_config:
            parts = rate_config.split("/")
            self.max_requests = int(parts[0])
            self.window_seconds = int(parts[1])
        else:
            self.max_requests = 30
            self.window_seconds = 60
        # 允许覆盖
        if max_requests is not None:
            self.max_requests = max_requests
        if window_seconds is not None:
            self.window_seconds = window_seconds
        # IP -> [timestamp, ...]
        self._clients: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        # 免限流路径直接放行
        if request.url.path in self._EXEMPT_PATHS:
            return await call_next(request)

        # 获取客户端 IP
        client_ip = request.client.host if request.client else "unknown"

        # 滑动窗口清理
        now = time.time()
        window_start = now - self.window_seconds
        self._clients[client_ip] = [
            t for t in self._clients[client_ip] if t > window_start
        ]

        # 检查频率
        if len(self._clients[client_ip]) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "请求过于频繁，请稍后再试",
                    "retry_after": self.window_seconds,
                },
                headers={"Retry-After": str(self.window_seconds)},
            )

        # 记录本次请求
        self._clients[client_ip].append(now)

        # 定期清理过期记录（每 100 个请求触发一次）
        if len(self._clients) > 1000:
            self._cleanup(now)

        return await call_next(request)

    def _cleanup(self, now: float) -> None:
        """清理过期客户端记录"""
        window_start = now - self.window_seconds
        expired = [
            ip for ip, timestamps in self._clients.items()
            if not any(t > window_start for t in timestamps)
        ]
        for ip in expired:
            del self._clients[ip]

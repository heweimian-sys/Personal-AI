/**
 * Next.js API Route — 代理 /api/research 到后端 FastAPI
 * 比 next.config.ts rewrites 更可靠，避免开发模式下的竞态条件
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const resp = await fetch(`${BACKEND_URL}/api/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await resp.text();

    if (!resp.ok) {
      return new Response(text, {
        status: resp.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(text, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[API Route] 代理后端请求失败:', err);
    return new Response(
      JSON.stringify({ error: '后端服务不可用', detail: String(err) }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

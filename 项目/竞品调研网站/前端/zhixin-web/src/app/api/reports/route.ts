/**
 * Next.js API Route — 代理 /api/reports 到后端 FastAPI
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit');
    const target = new URL(`${BACKEND_URL}/api/reports`);
    if (limit) target.searchParams.set('limit', limit);

    const resp = await fetch(target);
    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: '后端服务不可用', detail: String(err) }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

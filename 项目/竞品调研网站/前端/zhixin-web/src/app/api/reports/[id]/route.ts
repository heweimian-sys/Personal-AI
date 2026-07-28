/**
 * Next.js API Route — 代理 /api/reports/:id 到后端 FastAPI
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyReport(id, 'GET');
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyReport(id, 'DELETE');
}

async function proxyReport(id: string, method: 'GET' | 'DELETE') {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/reports/${encodeURIComponent(id)}`, {
      method,
    });
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

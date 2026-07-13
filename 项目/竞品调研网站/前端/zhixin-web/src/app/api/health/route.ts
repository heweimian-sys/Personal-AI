/**
 * Next.js API Route — 代理 /api/health 到后端 /health
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const resp = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
    });

    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ status: 'error', error: String(err) }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

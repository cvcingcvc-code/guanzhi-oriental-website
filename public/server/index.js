const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/inquiries') {
      if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
      let data;
      try {
        data = await request.json();
      } catch {
        return json({ ok: false, error: 'Invalid request body' }, 400);
      }
      const name = String(data.name || '').trim();
      const contact = String(data.contact || '').trim();
      const brief = String(data.brief || '').trim();
      if (name.length < 2 || contact.length < 3 || brief.length < 6) {
        return json({ ok: false, error: 'Please complete all fields' }, 422);
      }
      return json({ ok: true, inquiry_id: crypto.randomUUID(), received_at: new Date().toISOString() }, 201);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404 || request.method !== 'GET') return assetResponse;
    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
  },
};

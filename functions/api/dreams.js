export async function onRequestGet(context) {
  const kv = context.env.DREAMS_KV;
  if (!kv) return new Response(JSON.stringify({ error: 'Storage not configured' }), { status: 500 });

  try {
    const url = new URL(context.request.url);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const indexStr = await kv.get('public:index') || '[]';
    const index = JSON.parse(indexStr);

    const page = index.slice(offset, offset + limit).map(entry => ({
      ...entry,
      thumbnailUrl: entry.thumbnail ? `/api/img?key=${encodeURIComponent(entry.thumbnail)}` : null,
    }));

    return new Response(JSON.stringify({
      dreams: page,
      total: index.length,
      hasMore: offset + limit < index.length,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

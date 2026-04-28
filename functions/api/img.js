export async function onRequestGet(context) {
  const r2 = context.env.DREAMS_R2;
  if (!r2) return new Response('Storage not configured', { status: 500 });

  const url = new URL(context.request.url);
  const key = url.searchParams.get('key');
  if (!key) return new Response('Missing key', { status: 400 });

  try {
    const object = await r2.get(key);
    if (!object) return new Response('Not found', { status: 404 });

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(object.body, { headers });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}

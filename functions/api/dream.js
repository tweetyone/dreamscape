export async function onRequestGet(context) {
  const kv = context.env.DREAMS_KV;
  const r2 = context.env.DREAMS_R2;
  if (!kv || !r2) return new Response(JSON.stringify({ error: 'Storage not configured' }), { status: 500 });

  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });

  try {
    const data = await kv.get(`dream:${id}`);
    if (!data) return new Response(JSON.stringify({ error: 'Dream not found' }), { status: 404 });

    const dream = JSON.parse(data);

    // Generate signed URLs for images (or serve directly)
    for (const scene of dream.scenes) {
      if (scene.imageKey) {
        scene.imageUrl = `/api/img?key=${encodeURIComponent(scene.imageKey)}`;
      }
    }

    return new Response(JSON.stringify(dream), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

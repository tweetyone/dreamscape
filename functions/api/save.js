export async function onRequestPost(context) {
  const kv = context.env.DREAMS_KV;
  const r2 = context.env.DREAMS_R2;
  if (!kv || !r2) return new Response(JSON.stringify({ error: 'Storage not configured' }), { status: 500 });

  try {
    const { title, style, scenes, visualThread, isPublic } = await context.request.json();
    if (!title || !scenes?.length) return new Response(JSON.stringify({ error: 'Missing data' }), { status: 400 });

    // Generate short ID
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    // Upload images to R2, replace dataUrl with R2 key
    const scenesData = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      let imageKey = null;

      if (scene.dataUrl) {
        // Convert base64 data URL to binary
        const match = scene.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const contentType = match[1];
          const binary = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
          imageKey = `${id}/${i}.${contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg'}`;
          await r2.put(imageKey, binary, { httpMetadata: { contentType } });
        }
      }

      scenesData.push({
        lines: scene.lines,
        imageKey,
      });
    }

    // Save metadata to KV
    const dreamData = {
      id,
      title,
      style,
      visualThread: visualThread || '',
      scenes: scenesData,
      isPublic: isPublic !== false, // default public
      createdAt: Date.now(),
    };

    await kv.put(`dream:${id}`, JSON.stringify(dreamData));

    // If public, add to public index
    if (dreamData.isPublic) {
      const indexStr = await kv.get('public:index') || '[]';
      const index = JSON.parse(indexStr);
      index.unshift({
        id,
        title,
        style,
        thumbnail: scenesData[0]?.imageKey || null,
        createdAt: dreamData.createdAt,
      });
      // Keep last 500 entries
      if (index.length > 500) index.length = 500;
      await kv.put('public:index', JSON.stringify(index));
    }

    return new Response(JSON.stringify({ id, url: `/d/${id}` }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

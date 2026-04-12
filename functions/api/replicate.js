export async function onRequestPost(context) {
  const token = context.env.REPLICATE_TOKEN;
  if (!token) return new Response(JSON.stringify({ error: 'REPLICATE_TOKEN not configured' }), { status: 500 });

  try {
    const { prompt, aspect_ratio } = await context.request.json();

    const resp = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio: aspect_ratio || '16:9',
          num_outputs: 1,
          output_format: 'webp',
          output_quality: 90,
        },
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return new Response(err, { status: resp.status });
    }

    const data = await resp.json();

    if (data.output && data.output.length > 0) {
      // Download the image and convert to base64 data URL
      // This avoids CORS issues when drawing to canvas for poster
      const imgResp = await fetch(data.output[0]);
      if (!imgResp.ok) throw new Error('Failed to download image');
      const imgBuffer = await imgResp.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
      const contentType = imgResp.headers.get('content-type') || 'image/webp';

      return new Response(JSON.stringify({ dataUrl: `data:${contentType};base64,${base64}` }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'No output' }), { status: 500 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

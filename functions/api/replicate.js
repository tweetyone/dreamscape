export async function onRequestPost(context) {
  const token = context.env.REPLICATE_TOKEN;
  if (!token) return new Response(JSON.stringify({ error: 'REPLICATE_TOKEN not configured' }), { status: 500 });

  try {
    const { prompt, aspect_ratio } = await context.request.json();

    // Flux Schnell is fast enough to use the sync API (usually returns in 2-4s)
    const resp = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',  // Sync mode — waits for result
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

    // Flux Schnell returns output as array of URLs
    if (data.output && data.output.length > 0) {
      return new Response(JSON.stringify({ url: data.output[0] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'No output' }), { status: 500 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

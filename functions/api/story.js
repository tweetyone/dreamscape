export async function onRequestPost(context) {
  const key = context.env.GEMINI_KEY;
  if (!key) return new Response(JSON.stringify({ error: 'GEMINI_KEY not configured' }), { status: 500 });

  try {
    const body = await context.request.text();
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
    );
    const data = await resp.text();
    return new Response(data, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

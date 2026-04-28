// Catch-all for /d/[dreamId] — serve the main index.html
// The frontend JS will detect the URL and load the dream
export async function onRequest(context) {
  const url = new URL(context.request.url);
  // Rewrite to serve index.html
  const indexUrl = new URL('/', url.origin);
  const resp = await context.env.ASSETS.fetch(new Request(indexUrl, context.request));
  return new Response(resp.body, {
    status: resp.status,
    headers: resp.headers,
  });
}
